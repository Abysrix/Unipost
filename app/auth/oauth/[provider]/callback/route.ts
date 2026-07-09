import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getUser";
import { platforms, type PlatformId } from "@/config/platforms";
import { verifyState } from "@/lib/integrations/crypto";
import { exchangeCode } from "@/lib/integrations/oauth";
import { completeConnection } from "@/lib/db/integrations";
import { isSafeRedirect } from "@/lib/utils";

export const runtime = "nodejs";

function isPlatformId(v: string): v is PlatformId {
  return platforms.some((p) => p.id === v);
}

/**
 * GET /auth/oauth/[provider]/callback — the redirect target for both real
 * provider OAuth screens and the internal mock-consent page. Same code path
 * either way: verify state → exchange code → persist the connection.
 */
export async function GET(request: Request, { params }: { params: { provider: string } }) {
  const { origin, searchParams } = new URL(request.url);
  const fail = (reason: string) => NextResponse.redirect(`${origin}/integrations?error=${reason}&platform=${params.provider}`);

  if (!isPlatformId(params.provider)) return fail("unknown_platform");
  const platform = params.provider;

  if (searchParams.get("error")) return fail("access_denied");

  const stateToken = searchParams.get("state");
  const code = searchParams.get("code");
  if (!stateToken || !code) return fail("missing_params");

  const state = verifyState(stateToken);
  if (!state || state.platform !== platform) return fail("invalid_state");

  const user = await getCurrentUser();
  if (!user || user.id !== state.userId) return fail("session_mismatch");

  try {
    const redirectUri = `${origin}/auth/oauth/${platform}/callback`;
    const { tokens, profile } = await exchangeCode(platform, code, redirectUri, `${user.id}:${platform}`);
    await completeConnection(platform, profile, tokens);
  } catch (e) {
    const message = e instanceof Error ? e.message : "connect_failed";
    return NextResponse.redirect(`${origin}/integrations?error=${encodeURIComponent(message)}&platform=${platform}`);
  }

  const returnTo = isSafeRedirect(state.returnTo) ? state.returnTo : "/integrations";
  return NextResponse.redirect(`${origin}${returnTo}?connected=${platform}`);
}
