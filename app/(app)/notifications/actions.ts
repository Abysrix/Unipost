"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/getUser";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/notifications/service";

export async function markNotificationReadAction(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await markNotificationRead(user.id, id);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await markAllNotificationsRead(user.id);
  revalidatePath("/", "layout");
}
