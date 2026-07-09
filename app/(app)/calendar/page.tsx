import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { requireUser } from "@/lib/auth/getUser";
import { listEvents } from "@/lib/db/schedule";
import { listDrafts } from "@/lib/db/posts";
import PageHeader from "@/components/dashboard/PageHeader";
import SchedulerStudio from "@/components/schedule/SchedulerStudio";
import type { ScheduledEvent } from "@/types/schedule";
import type { Post } from "@/types/post";

export const metadata: Metadata = { title: "Calendar · UniPost" };
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  await requireUser();

  // Best-effort: if the scheduling tables aren't migrated yet, load an empty calendar.
  let events: ScheduledEvent[] = [];
  let drafts: Post[] = [];
  try {
    [events, drafts] = await Promise.all([listEvents(), listDrafts()]);
  } catch {
    /* tables not ready — render an empty scheduler */
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Calendar" description="Plan, schedule and queue your content across every platform." icon={CalendarDays} />
      <SchedulerStudio initialEvents={events} drafts={drafts} />
    </div>
  );
}
