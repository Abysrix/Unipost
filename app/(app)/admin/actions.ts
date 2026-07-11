"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth/getUser";
import { isAdmin, type Role } from "@/lib/auth/role";
import type { Plan } from "@/lib/auth/role";
import { getOwnProfile } from "@/lib/db/profiles";
import * as users from "@/lib/db/admin/users";
import * as billing from "@/lib/db/admin/billing";
import * as moderation from "@/lib/db/admin/moderation";
import * as flags from "@/lib/db/admin/flags";
import * as health from "@/lib/db/admin/health";
import type { HealthCheck } from "@/types/admin";

/** Every admin action re-checks the role server-side — defense in depth beyond the layout gate. */
async function guardAdmin() {
  const user = await requireUser();
  const profile = await getOwnProfile();
  if (!isAdmin(profile.role)) redirect("/dashboard");
  return user;
}

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/billing");
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/settings");
}

/* ── Users (Phase 2) ── */
export async function suspendUserAction(id: string): Promise<{ error?: string }> {
  const admin = await guardAdmin();
  try {
    await users.suspendUser(id, admin.id);
    revalidateAdmin();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to suspend user." };
  }
}

export async function reactivateUserAction(id: string): Promise<{ error?: string }> {
  const admin = await guardAdmin();
  try {
    await users.reactivateUser(id, admin.id);
    revalidateAdmin();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to reactivate user." };
  }
}

/** Irreversible. The UI requires typing the user's email before calling this. */
export async function deleteUserAction(id: string): Promise<{ error?: string }> {
  const admin = await guardAdmin();
  try {
    await users.deleteUserAccount(id, admin.id);
    revalidateAdmin();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete user." };
  }
}

export async function changeUserRoleAction(id: string, role: Role): Promise<{ error?: string }> {
  const admin = await guardAdmin();
  try {
    await users.changeUserRole(id, role, admin.id);
    revalidateAdmin();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to change role." };
  }
}

export async function triggerPasswordResetAction(email: string): Promise<{ error?: string }> {
  const admin = await guardAdmin();
  try {
    const origin = headers().get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    await users.triggerPasswordReset(email, admin.id, origin);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to send reset email." };
  }
}

/** Future-ready placeholder — real session-swapping is a separate, dedicated security feature. */
export async function impersonateUserAction(): Promise<{ error: string }> {
  await guardAdmin();
  return { error: "Impersonation isn't implemented yet — this is a placeholder for a future sprint." };
}

/* ── Billing / subscriptions (Phase 3) ── */
export async function adminSetPlanAction(userId: string, plan: Plan): Promise<{ error?: string }> {
  const admin = await guardAdmin();
  try {
    await billing.adminSetPlan(userId, plan, admin.id);
    revalidateAdmin();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to change plan." };
  }
}

export async function adminCancelSubscriptionAction(userId: string): Promise<{ error?: string }> {
  await guardAdmin().then((a) => billing.adminCancelSubscription(userId, a.id));
  revalidateAdmin();
  return {};
}

export async function adminRenewSubscriptionAction(userId: string): Promise<{ error?: string }> {
  await guardAdmin().then((a) => billing.adminRenewSubscription(userId, a.id));
  revalidateAdmin();
  return {};
}

export async function adminRecordRefundAction(paymentId: string, note?: string): Promise<{ error?: string }> {
  const admin = await guardAdmin();
  try {
    await billing.adminRecordRefund(paymentId, admin.id, note);
    revalidateAdmin();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to record refund." };
  }
}

/* ── Content moderation (Phase 6) ── */
export async function flagPostAction(id: string, note: string): Promise<{ error?: string }> {
  const admin = await guardAdmin();
  try {
    await moderation.flagPost(id, note, admin.id);
    revalidateAdmin();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to flag post." };
  }
}

export async function unflagPostAction(id: string): Promise<{ error?: string }> {
  const admin = await guardAdmin();
  try {
    await moderation.unflagPost(id, admin.id);
    revalidateAdmin();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to unflag post." };
  }
}

export async function adminDeletePostAction(id: string, reason?: string): Promise<{ error?: string }> {
  const admin = await guardAdmin();
  try {
    await moderation.adminDeletePost(id, admin.id, reason);
    revalidateAdmin();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete post." };
  }
}

export async function bulkModerateAction(ids: string[], action: "flag" | "unflag" | "delete", note?: string): Promise<{ error?: string }> {
  const admin = await guardAdmin();
  try {
    await moderation.bulkModerate(ids, action, admin.id, note);
    revalidateAdmin();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Bulk action failed." };
  }
}

/* ── Feature flags (Phase 8) ── */
export async function setFeatureFlagAction(id: string, enabled: boolean): Promise<{ error?: string }> {
  const admin = await guardAdmin();
  try {
    await flags.setFeatureFlag(id, enabled, admin.id);
    revalidatePath("/admin/settings");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update flag." };
  }
}

/* ── Platform health (Phase 5) ── */
export async function runHealthCheckAction(): Promise<{ checks?: HealthCheck[]; error?: string }> {
  await guardAdmin();
  try {
    const checks = await health.runHealthCheck();
    revalidatePath("/admin/health");
    return { checks };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Health check failed." };
  }
}
