import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPlatform, platforms, type PlatformId } from "@/config/platforms";
import { providerConfig, hasRealCredentials } from "@/lib/integrations/providers";
import { previewStubIdentity } from "@/lib/integrations/oauth";
import { verifyState } from "@/lib/integrations/crypto";
import MockConsentScreen from "@/components/integrations/MockConsentScreen";

export const metadata: Metadata = { title: "Connect · UniPost" };
export const dynamic = "force-dynamic";

function isPlatformId(v: string): v is PlatformId {
  return platforms.some((p) => p.id === v);
}

/**
 * Internal mock consent screen — stands in for the real provider's OAuth
 * screen when no client credentials are configured (see lib/integrations/
 * oauth.ts). Redirects to the exact same callback route a real provider
 * would, so the rest of the connect flow is genuinely exercised end to end.
 */
export default function MockConnectPage({ params, searchParams }: { params: { provider: string }; searchParams: { [key: string]: string | string[] | undefined } }) {
  if (!isPlatformId(params.provider)) redirect("/integrations?error=unknown_platform");
  const platform = params.provider;
  if (hasRealCredentials(platform)) redirect(`/auth/oauth/${platform}/start`);

  const stateToken = typeof searchParams.state === "string" ? searchParams.state : null;
  const state = stateToken ? verifyState(stateToken) : null;

  if (!state || state.platform !== platform) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
        <h1 className="font-display text-xl font-bold text-white">This connection link expired</h1>
        <p className="mt-2 text-sm text-white/45">Head back to Integrations and try connecting again.</p>
        <a href="/integrations" className="mt-5 rounded-full border border-white/[0.12] px-5 py-2 text-sm font-medium text-white/70 hover:border-white/25 hover:text-white">
          Back to Integrations
        </a>
      </div>
    );
  }

  const platformMeta = getPlatform(platform);
  if (!platformMeta) redirect("/integrations?error=unknown_platform");

  const identity = previewStubIdentity(platform, `${state.userId}:${platform}`);
  const scopes = providerConfig(platform).scopes;

  return (
    <MockConsentScreen
      platform={platform}
      platformName={platformMeta.name}
      platformColor={platformMeta.color}
      platformGlyph={platformMeta.glyph}
      identity={identity}
      scopes={scopes}
      state={stateToken as string}
      returnTo={state.returnTo}
    />
  );
}
