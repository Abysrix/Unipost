import type { User } from "@supabase/supabase-js";
import { createAdminClient, syncPlanMetadata } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getRole, getPlan, type Role, type Plan } from "@/lib/auth/role";
import { logAudit } from "./audit";
import type { AdminUserRow, AdminUserDetail, UserListFilters, UserListResult } from "@/types/admin";

/**
 * The user directory is Supabase Auth itself (`listUsers`) — there's still no
 * `profiles` table (a standing gap since Sprint 1). Search/filter is done in
 * memory over the full user list, which is honest and fine at admin-panel
 * scale (hundreds of users); it is NOT built for a millions-of-users search
 * index — that would need a real `profiles` table with a search column.
 * The expensive per-user joins (credits, score, connections) are only ever
 * batched for the current PAGE of results, never the whole directory.
 */

function toRow(u: User, extra: { plan: Plan; status: AdminUserRow["subscriptionStatus"]; credits: number; score: number | null; accounts: number }): AdminUserRow {
  const meta = u.user_metadata as { full_name?: string; name?: string } | undefined;
  return {
    id: u.id,
    email: u.email ?? "",
    displayName: meta?.full_name ?? meta?.name ?? u.email?.split("@")[0] ?? "Creator",
    role: getRole(u),
    plan: extra.plan,
    subscriptionStatus: extra.status,
    creditsRemaining: extra.credits,
    creatorScore: extra.score,
    connectedAccounts: extra.accounts,
    banned: isBanned(u),
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
  };
}

function isBanned(u: User): boolean {
  const bannedUntil = (u as unknown as { banned_until?: string }).banned_until;
  return Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now());
}

export async function listUsers(filters: UserListFilters = {}): Promise<UserListResult> {
  const admin = createAdminClient();
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? 20;

  // Auth admin API caps a single page; 1000 covers early-stage scale in one call.
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;

  let all = data.users;
  if (filters.query) {
    const q = filters.query.toLowerCase();
    all = all.filter((u) => u.email?.toLowerCase().includes(q) || JSON.stringify(u.user_metadata ?? {}).toLowerCase().includes(q));
  }
  if (filters.role) all = all.filter((u) => getRole(u) === filters.role);
  if (filters.status) all = all.filter((u) => (filters.status === "banned" ? isBanned(u) : !isBanned(u)));

  all.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const total = all.length;
  const pageUsers = all.slice((page - 1) * perPage, page * perPage);
  const ids = pageUsers.map((u) => u.id);

  const [subs, credits, scores, accounts] = await Promise.all([
    admin.from("subscriptions").select("user_id,plan,status").in("user_id", ids),
    admin.from("ai_credit_history").select("user_id,amount").in("user_id", ids),
    admin.from("creator_scores").select("user_id,score,computed_at").in("user_id", ids).order("computed_at", { ascending: false }),
    admin.from("connected_accounts").select("user_id,status").in("user_id", ids).neq("status", "disconnected"),
  ]);

  const subByUser = new Map((subs.data as { user_id: string; plan: Plan; status: AdminUserRow["subscriptionStatus"] }[] | null ?? []).map((s) => [s.user_id, s]));
  const creditByUser = new Map<string, number>();
  for (const c of (credits.data as { user_id: string; amount: number }[] | null) ?? []) creditByUser.set(c.user_id, (creditByUser.get(c.user_id) ?? 0) + c.amount);
  const scoreByUser = new Map<string, number>();
  for (const s of (scores.data as { user_id: string; score: number }[] | null) ?? []) if (!scoreByUser.has(s.user_id)) scoreByUser.set(s.user_id, s.score);
  const accountsByUser = new Map<string, number>();
  for (const a of (accounts.data as { user_id: string }[] | null) ?? []) accountsByUser.set(a.user_id, (accountsByUser.get(a.user_id) ?? 0) + 1);

  let rows = pageUsers.map((u) =>
    toRow(u, {
      plan: subByUser.get(u.id)?.plan ?? getPlan(u),
      status: subByUser.get(u.id)?.status ?? "active",
      credits: creditByUser.get(u.id) ?? 0,
      score: scoreByUser.get(u.id) ?? null,
      accounts: accountsByUser.get(u.id) ?? 0,
    }),
  );
  if (filters.plan) rows = rows.filter((r) => r.plan === filters.plan);

  return { users: rows, total, page, perPage };
}

/** Every matching user, unpaginated — for CSV export. Same in-memory filter, no page join (cheap columns only). */
export async function listAllUsersForExport(filters: UserListFilters = {}): Promise<AdminUserRow[]> {
  const full = await listUsers({ ...filters, page: 1, perPage: 100_000 });
  return full.users;
}

export async function getUserDetail(id: string): Promise<AdminUserDetail | null> {
  const admin = createAdminClient();
  const { data: userData, error } = await admin.auth.admin.getUserById(id);
  if (error || !userData.user) return null;
  const u = userData.user;

  const [sub, creditsRows, scoreRows, accountsRows, postsRows, scheduledRows, xpRows] = await Promise.all([
    admin.from("subscriptions").select("plan,status").eq("user_id", id).maybeSingle(),
    admin.from("ai_credit_history").select("amount").eq("user_id", id),
    admin.from("creator_scores").select("score").eq("user_id", id).order("computed_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("connected_accounts").select("id").eq("user_id", id).neq("status", "disconnected"),
    admin.from("posts").select("id", { count: "exact", head: true }).eq("user_id", id).is("deleted_at", null),
    admin.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("user_id", id).in("status", ["scheduled", "queued"]),
    admin.from("xp_history").select("amount").eq("user_id", id),
  ]);

  const credits = ((creditsRows.data as { amount: number }[] | null) ?? []).reduce((s, r) => s + r.amount, 0);
  const xpTotal = ((xpRows.data as { amount: number }[] | null) ?? []).reduce((s, r) => s + r.amount, 0);
  const subRow = sub.data as { plan: Plan; status: AdminUserRow["subscriptionStatus"] } | null;

  return {
    ...toRow(u, {
      plan: subRow?.plan ?? getPlan(u),
      status: subRow?.status ?? "active",
      credits,
      score: (scoreRows.data as { score: number } | null)?.score ?? null,
      accounts: (accountsRows.data as unknown[] | null)?.length ?? 0,
    }),
    emailConfirmed: Boolean(u.email_confirmed_at),
    totalPosts: postsRows.count ?? 0,
    scheduledPosts: scheduledRows.count ?? 0,
    xpTotal,
  };
}

/* ── Mutations (all audited) ── */
export async function suspendUser(id: string, actorId: string, reason?: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: "87600h" }); // ~10 years
  if (error) throw error;
  await logAudit("admin_action", "user_suspended", { actorId, targetId: id, message: reason });
}

export async function reactivateUser(id: string, actorId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: "none" });
  if (error) throw error;
  await logAudit("admin_action", "user_reactivated", { actorId, targetId: id });
}

/** Irreversible — cascades to every row this user owns via `on delete cascade`. */
export async function deleteUserAccount(id: string, actorId: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(id);
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw error;
  await logAudit("admin_action", "user_deleted", { actorId, targetId: id, message: data.user?.email ?? undefined });
}

export async function changeUserRole(id: string, role: Role, actorId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: existing } = await admin.auth.admin.getUserById(id);
  const appMeta = (existing.user?.app_metadata as Record<string, unknown> | undefined) ?? {};
  const { error } = await admin.auth.admin.updateUserById(id, { app_metadata: { ...appMeta, role } });
  if (error) throw error;
  await logAudit("role_change", "role_changed", { actorId, targetId: id, message: `Role set to ${role}`, metadata: { role } });
}

export async function overrideUserPlan(id: string, plan: Plan, actorId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("subscriptions").upsert({ user_id: id, plan, status: "active" }, { onConflict: "user_id" });
  await syncPlanMetadata(id, plan);
  await logAudit("admin_action", "plan_overridden", { actorId, targetId: id, message: `Plan set to ${plan}`, metadata: { plan } });
}

/** Sends Supabase's built-in recovery email — lands on /reset-password to set a new password. */
export async function triggerPasswordReset(email: string, actorId: string, origin: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset-password` });
  if (error) throw error;
  await logAudit("admin_action", "password_reset_triggered", { actorId, message: email });
}
