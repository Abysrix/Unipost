"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/getUser";
import * as db from "@/lib/db/integrations";
import type { SyncOutcome } from "@/lib/integrations/sync";
import type { SyncLog, IntegrationEvent } from "@/types/integrations";

async function guard() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

function revalidate() {
  revalidatePath("/integrations");
  revalidatePath("/settings");
}

export async function disconnectAction(id: string): Promise<{ error?: string }> {
  await guard();
  try {
    await db.disconnectAccount(id);
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to disconnect." };
  }
}

export async function deleteConnectionAction(id: string): Promise<{ error?: string }> {
  await guard();
  try {
    await db.deleteConnection(id);
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to remove." };
  }
}

export async function syncNowAction(id: string): Promise<SyncOutcome> {
  await guard();
  const res = await db.syncAccount(id, "manual");
  revalidate();
  return res;
}

export async function validateAction(id: string): Promise<SyncOutcome> {
  await guard();
  const res = await db.validateConnection(id);
  revalidate();
  return res;
}

export async function setDefaultAction(id: string): Promise<{ error?: string }> {
  await guard();
  try {
    await db.setDefaultAccount(id);
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to set default account." };
  }
}

export async function renameAction(id: string, nickname: string): Promise<{ error?: string }> {
  await guard();
  try {
    await db.renameConnection(id, nickname.trim() || null);
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to rename." };
  }
}

/** Fetched lazily when a connection's detail view opens (not on every hub load). */
export async function getConnectionActivity(id: string): Promise<{ logs: SyncLog[]; events: IntegrationEvent[] }> {
  await guard();
  const [logs, events] = await Promise.all([db.listSyncLogs(id), db.listIntegrationEvents(id)]);
  return { logs, events };
}
