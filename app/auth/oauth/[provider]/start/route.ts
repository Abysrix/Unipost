import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/getUser";
import { platforms, type PlatformId } from "@/config/platforms";
import { signState, newNonce } from "@/lib/integrations/crypto";
import { buildAuthorizeUrl } from "@/lib/integrations/oauth";

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
  const redirectUri = `${origin}/auth/oauth/${platform}/callback`;

  try {
    const state = signState({ userId: user.id, platform, nonce: newNonce(), returnTo, iat: Date.now() });
    const authorizeUrl = buildAuthorizeUrl(platform, state, redirectUri);
    const target = authorizeUrl.startsWith("http") ? authorizeUrl : `${origin}${authorizeUrl}`;
    return NextResponse.redirect(target);
  } catch {
    return NextResponse.redirect(`${origin}/integrations?error=start_failed&platform=${platform}`);
  }
}
