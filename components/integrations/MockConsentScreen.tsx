"use client";

import { useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import type { PlatformId } from "@/config/platforms";
import type { ProviderProfile } from "@/types/integrations";
import { mockAuthorize, mockDeny } from "@/app/(app)/integrations/connect/[provider]/actions";

/**
 * Stands in for a real provider's OAuth consent screen (Instagram/LinkedIn/etc.)
 * when no client credentials are configured. Visually distinct from UniPost's
 * own UI on purpose — it's meant to read as "a different site," the same way
 * a real provider's consent screen would.
 */
export default function MockConsentScreen({
  platform,
  platformName,
  platformColor,
  platformGlyph,
  identity,
  scopes,
  state,
  returnTo,
}: {
  platform: PlatformId;
  platformName: string;
  platformColor: string;
  platformGlyph: string;
  identity: ProviderProfile;
  scopes: string[];
  state: string;
  returnTo: string;
}) {
  const [busy, setBusy] = useState<"allow" | "deny" | null>(null);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center">
      <div className="w-full rounded-2xl border border-black/10 bg-[#f5f5f7] p-6 text-[#1d1d1f] shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
        <div className="mb-5 flex flex-col items-center text-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-white" style={{ background: platformColor }}>
            {platformGlyph}
          </span>
          <p className="text-xs font-medium uppercase tracking-wide text-black/40">Simulated · no real {platformName} account is contacted</p>
          <h1 className="mt-2 font-display text-lg font-bold">UniPost wants to access your {platformName} account</h1>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-xl border border-black/10 bg-white p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-sm font-bold">{identity.displayName.charAt(0)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{identity.displayName}</p>
            {identity.username && <p className="truncate text-xs text-black/45">@{identity.username}</p>}
          </div>
        </div>

        <div className="mb-5">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-black/60">
            <ShieldCheck size={13} /> This will allow UniPost to:
          </p>
          <ul className="space-y-1">
            {scopes.map((s) => (
              <li key={s} className="rounded-md bg-black/[0.03] px-2.5 py-1.5 font-mono text-[11px] text-black/60">{s}</li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2">
          <button
            onClick={async () => {
              setBusy("deny");
              await mockDeny(returnTo);
            }}
            disabled={busy !== null}
            className="flex-1 rounded-lg border border-black/15 py-2.5 text-sm font-medium text-black/70 transition-colors hover:bg-black/[0.03] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setBusy("allow");
              await mockAuthorize(platform, state);
            }}
            disabled={busy !== null}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1d1d1f] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy === "allow" ? <Loader2 size={14} className="animate-spin" /> : null} Allow
          </button>
        </div>
      </div>
      <p className="mt-4 max-w-xs text-center text-[11px] text-white/30">
        No real credentials are configured for {platformName} yet, so this is a simulated consent screen. Add real OAuth
        credentials to <code className="text-white/40">.env.local</code> to connect for real.
      </p>
    </div>
  );
}
