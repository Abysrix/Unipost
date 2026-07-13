import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/getUser";
import { platforms, type PlatformId } from "@/config/platforms";
import { signState, newNonce, generateCodeVerifier } from "@/lib/integrations/crypto";
import { buildAuthorizeUrl, requiresPkce } from "@/lib/integrations/oauth";

const PKCE_COOKIE = "unipost_pkce_verifier";

export const runtime = "nodejs";

function isPlatformId(v: string): v is PlatformId {
  return platforms.some((p) => p.id === v);
}

/**
 * GET /auth/oauth/[provider]/start — begins the connect flow for a platform.
 * Requires an active UniPost session (these routes sit outside the `(app)`
 * route group, so unlike other protected pages they check auth themselves).
 */
export async function GET(request: Request, { params }: { params: { provider: string } }) {
  const user = await requireUser(); // redirects to /login if signed out
  const { origin, searchParams } = new URL(request.url);

  if (!isPlatformId(params.provider)) {
    return NextResponse.redirect(`${origin}/integrations?error=unknown_platform`);
  }
  const platform = params.provider;
  const returnTo = searchParams.get("returnTo") ?? "/integrations";
  const baseOrigin = !origin.includes("localhost") && !origin.includes("127.0.0.1")
    ? origin.replace("http://", "https://")
    : origin;
  const redirectUri = `${baseOrigin}/auth/oauth/${platform}/callback`;

  try {
    // The verifier stays server-side in an httpOnly cookie rather than riding
    // in the signed `state` (which round-trips through the browser and the
    // provider's own callback URL, right alongside the authorization `code`)
    // — otherwise anyone who can observe that URL has everything needed to
    // redeem the code themselves, defeating what PKCE exists to prevent.
    const codeVerifier = requiresPkce(platform) ? generateCodeVerifier() : undefined;
    if (codeVerifier) {
      cookies().set(PKCE_COOKIE, codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax", // must survive the top-level cross-site redirect back from the provider
        maxAge: 600, // matches verifyState's 10-minute state-token window
        path: "/auth/oauth",
      });
    }
    const state = signState({ userId: user.id, platform, nonce: newNonce(), returnTo, iat: Date.now() });
    const authorizeUrl = buildAuthorizeUrl(platform, state, redirectUri, codeVerifier);
    const target = authorizeUrl.startsWith("http") ? authorizeUrl : `${origin}${authorizeUrl}`;
    return NextResponse.redirect(target);
  } catch {
    return NextResponse.redirect(`${origin}/integrations?error=start_failed&platform=${platform}`);
  }
}
