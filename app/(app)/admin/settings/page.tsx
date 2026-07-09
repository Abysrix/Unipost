import type { Metadata } from "next";
import { SlidersHorizontal, CheckCircle2, XCircle } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import WidgetContainer from "@/components/dashboard/WidgetContainer";
import { listFeatureFlags } from "@/lib/db/admin/flags";
import { envPresenceTable } from "@/lib/admin/health-checks";
import { PLAN_LIMITS, PLAN_ORDER, formatBytes } from "@/lib/billing/plans";
import FeatureFlagCard from "@/components/admin/FeatureFlagCard";

export const metadata: Metadata = { title: "Settings · Admin · UniPost" };
export const dynamic = "force-dynamic";

const CATEGORY_ORDER = ["maintenance", "general", "ai", "beta"] as const;
const CATEGORY_LABEL: Record<string, string> = { maintenance: "Maintenance", general: "General", ai: "AI features", beta: "Beta" };

export default async function AdminSettingsPage() {
  const [flags, env] = await Promise.all([listFeatureFlags(), Promise.resolve(envPresenceTable())]);

  return (
    <div>
      <PageHeader title="Settings" description="Feature flags, plan configuration and environment status." icon={SlidersHorizontal} />

      <div className="mb-5">
        <WidgetContainer title="Feature flags">
          <div className="flex flex-col gap-5">
            {CATEGORY_ORDER.map((cat) => {
              const inCat = flags.filter((f) => f.category === cat);
              if (inCat.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">{CATEGORY_LABEL[cat]}</p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {inCat.map((f) => (
                      <FeatureFlagCard key={f.id} flag={f} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </WidgetContainer>
      </div>

      <div className="mb-5">
        <WidgetContainer title="Plans & pricing" contentClassName="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.07] text-[11px] uppercase tracking-wider text-white/40">
                <th className="px-3 py-2.5">Plan</th>
                <th className="px-3 py-2.5">Price / mo</th>
                <th className="px-3 py-2.5">Price / yr (mo-equiv)</th>
                <th className="px-3 py-2.5">AI credits</th>
                <th className="px-3 py-2.5">Storage</th>
                <th className="px-3 py-2.5">Accounts</th>
                <th className="px-3 py-2.5">Scheduled posts</th>
                <th className="px-3 py-2.5">Seats</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_ORDER.map((id) => {
                const p = PLAN_LIMITS[id];
                return (
                  <tr key={id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-3 py-2.5 font-medium text-white/85">{p.name}</td>
                    <td className="px-3 py-2.5 text-white/60">₹{p.priceMonthly}</td>
                    <td className="px-3 py-2.5 text-white/60">₹{p.priceYearly}</td>
                    <td className="px-3 py-2.5 text-white/60">{Number.isFinite(p.aiCreditsPerMonth) ? p.aiCreditsPerMonth : "Unlimited"}</td>
                    <td className="px-3 py-2.5 text-white/60">{formatBytes(p.storageLimitBytes)}</td>
                    <td className="px-3 py-2.5 text-white/60">{Number.isFinite(p.maxConnectedAccounts) ? p.maxConnectedAccounts : "Unlimited"}</td>
                    <td className="px-3 py-2.5 text-white/60">{Number.isFinite(p.maxScheduledPosts) ? p.maxScheduledPosts : "Unlimited"}</td>
                    <td className="px-3 py-2.5 text-white/60">{p.teamSeats}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-white/25">Read-only — defined in lib/billing/plans.ts. Editing plan economics is a code change, not a runtime setting.</p>
        </WidgetContainer>
      </div>

      <WidgetContainer title="Environment configuration">
        <div className="grid gap-2 sm:grid-cols-2">
          {env.map((e) => (
            <div key={e.key} className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[12.5px] text-white/75">{e.label}</p>
                <p className="truncate font-mono text-[10px] text-white/25">{e.key}</p>
              </div>
              {e.present ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-aurora-green/12 px-2 py-0.5 text-[10px] font-medium text-aurora-green"><CheckCircle2 size={10} /> Configured</span>
              ) : (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/40"><XCircle size={10} /> Missing</span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-white/25">Presence only — values are never displayed here.</p>
      </WidgetContainer>
    </div>
  );
}
