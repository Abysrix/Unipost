import type { PlatformId } from "@/config/platforms";
import type { ScheduledEvent } from "@/types/schedule";
import { QUEUE_LIMIT_PER_PLATFORM } from "./scheduling";

/** Active queue statuses (what shows in the queue, excludes published/canceled). */
const ACTIVE = new Set(["scheduled", "queued", "publishing"]);

export interface PlatformQueue {
  platform: PlatformId;
  items: ScheduledEvent[];
  failed: ScheduledEvent[];
  /** Active count vs. the soft limit. */
  count: number;
  limit: number;
  atLimit: boolean;
}

/** Sort a queue: priority first, then position, then time. Pure. */
export function sortQueue(items: ScheduledEvent[]): ScheduledEvent[] {
  return [...items].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    if (a.position !== b.position) return a.position - b.position;
    return a.scheduled_time.localeCompare(b.scheduled_time);
  });
}

/** Group events into per-platform queues (active + failed lanes). Pure. */
export function buildQueues(events: ScheduledEvent[]): PlatformQueue[] {
  const byPlatform = new Map<PlatformId, ScheduledEvent[]>();
  for (const e of events) {
    if (e.status === "published" || e.status === "canceled") continue;
    const list = byPlatform.get(e.platform) ?? [];
    list.push(e);
    byPlatform.set(e.platform, list);
  }
  return Array.from(byPlatform.entries()).map(([platform, list]) => {
    const active = sortQueue(list.filter((e) => ACTIVE.has(e.status)));
    const failed = list.filter((e) => e.status === "failed");
    return {
      platform,
      items: active,
      failed,
      count: active.length,
      limit: QUEUE_LIMIT_PER_PLATFORM,
      atLimit: active.length >= QUEUE_LIMIT_PER_PLATFORM,
    };
  });
}

/** Reorder `ids` → a map of id→position (0-based). Pure; the caller persists it. */
export function positionsFor(ids: string[]): Record<string, number> {
  return ids.reduce<Record<string, number>>((acc, id, i) => {
    acc[id] = i;
    return acc;
  }, {});
}

/** Move an item within an ordered id list from `from` to `to`. Pure. */
export function moveInList(ids: string[], from: number, to: number): string[] {
  const next = [...ids];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
