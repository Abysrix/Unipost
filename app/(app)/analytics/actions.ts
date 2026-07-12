"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/getUser";
import { listConnections } from "@/lib/db/integrations";
import { syncAllAnalytics } from "@/lib/db/analytics";

/** Manual "Sync now" — refreshes real analytics for every platform the user has connected, right now, instead of waiting for the next background cron pass or page-load-triggered incremental sync. */
export async function syncAnalyticsNowAction(): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const connections = await listConnections();
  const platforms = Array.from(new Set(connections.filter((c) => c.status !== "disconnected").map((c) => c.platform)));
  if (platforms.length === 0) return { ok: true };

  const outcomes = await syncAllAnalytics(user.id, platforms, new Map());
  const failed = outcomes.filter((o) => !o.ok);
  revalidatePath("/analytics");
  revalidatePath("/dashboard");

  if (failed.length > 0 && failed.length === outcomes.length) {
    return { ok: false, error: failed[0].error ?? "Sync failed." };
  }
  return { ok: true };
}
