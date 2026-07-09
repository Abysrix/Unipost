import { createAdminClient } from "@/lib/supabase/admin";
import { planLimits } from "@/lib/billing/plans";
import type { Plan } from "@/lib/auth/role";
import type { AdminOverview } from "@/types/admin";

const DAY_MS = 86_400_000;

export async function getAdminOverview(): Promise<AdminOverview> {
  const admin = createAdminClient();
  const now = Date.now();
  const since7d = new Date(now - 7 * DAY_MS).toISOString();
  const since24h = new Date(now - DAY_MS).toISOString();
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const todayStart = new Date(new Date().toISOString().slice(0, 10)).toISOString();

  const [users, payments, activeSubs, aiGens, aiMsgs, scheduled, accounts, failedPayments, failedSync] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("payments").select("amount,created_at").eq("status", "captured").gte("created_at", monthStart),
    admin.from("subscriptions").select("plan,billing_cycle").eq("status", "active").neq("plan", "free"),
    admin.from("ai_generations").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
    admin.from("ai_messages").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
    admin.from("scheduled_posts").select("id", { count: "exact", head: true }).in("status", ["scheduled", "queued", "publishing"]),
    admin.from("connected_accounts").select("id", { count: "exact", head: true }).neq("status", "disconnected"),
    admin.from("payments").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", since24h),
    admin.from("sync_logs").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", since24h),
  ]);

  const allUsers = users.data?.users ?? [];
  const activeUsers7d = allUsers.filter((u) => u.last_sign_in_at && u.last_sign_in_at >= since7d).length;
  const newSignups7d = allUsers.filter((u) => u.created_at >= since7d).length;
  const revenueThisMonth = ((payments.data as { amount: number }[] | null) ?? []).reduce((s, p) => s + p.amount, 0);

  // MRR: normalize every active paid subscription to a monthly rate.
  const mrr = ((activeSubs.data as { plan: Plan; billing_cycle: "monthly" | "yearly" }[] | null) ?? []).reduce((sum, s) => {
    const limits = planLimits(s.plan);
    const monthly = s.billing_cycle === "yearly" ? limits.priceYearly : limits.priceMonthly;
    return sum + Math.round(monthly * 100);
  }, 0);

  return {
    totalUsers: allUsers.length,
    activeUsers7d,
    newSignups7d,
    revenueThisMonth,
    mrr,
    aiRequestsToday: (aiGens.count ?? 0) + (aiMsgs.count ?? 0),
    scheduledPostsActive: scheduled.count ?? 0,
    connectedAccountsActive: accounts.count ?? 0,
    failedJobs24h: (failedPayments.count ?? 0) + (failedSync.count ?? 0),
  };
}
