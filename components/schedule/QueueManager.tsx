"use client";

import { useState } from "react";
import { ListOrdered, AlertTriangle } from "lucide-react";
import PlatformBadge from "@/components/ui/PlatformBadge";
import EmptyState from "@/components/dashboard/EmptyState";
import { buildQueues, moveInList } from "@/lib/schedule/queue";
import type { PlatformId } from "@/config/platforms";
import type { ScheduledEvent } from "@/types/schedule";
import QueueCard from "./QueueCard";
import type { ScheduledCardHandlers } from "./ScheduledPostCard";

/**
 * Per-platform publishing queues: drag-to-reorder active items, a failed/retry
 * lane, and queue-limit indicators. Order is derived from `position`.
 */
export default function QueueManager({
  events,
  handlers,
  onReorder,
  busyId,
}: {
  events: ScheduledEvent[];
  handlers: ScheduledCardHandlers;
  onReorder: (orderedIds: string[]) => void;
  busyId?: string | null;
}) {
  const [drag, setDrag] = useState<{ platform: PlatformId; index: number } | null>(null);
  const queues = buildQueues(events);

  if (queues.length === 0) {
    return <EmptyState icon={ListOrdered} title="Your queue is empty" description="Schedule posts and they'll line up here, per platform." />;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {queues.map((q) => {
        const ids = q.items.map((e) => e.id);
        return (
          <section key={q.platform} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center justify-between">
              <PlatformBadge platform={q.platform} size="sm" />
              <div className="flex items-center gap-2">
                {q.atLimit && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-400/12 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                    <AlertTriangle size={10} /> Full
                  </span>
                )}
                <span className="font-mono text-[11px] text-white/35">{q.count}/{q.limit}</span>
              </div>
            </div>

            {q.items.length === 0 ? (
              <p className="py-4 text-center text-xs text-white/30">Nothing queued.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {q.items.map((ev, i) => (
                  <QueueCard
                    key={ev.id}
                    event={ev}
                    order={i + 1}
                    busy={busyId === ev.id}
                    dragging={drag?.platform === q.platform && drag.index === i}
                    onDragStart={() => setDrag({ platform: q.platform, index: i })}
                    onDragEnd={() => setDrag(null)}
                    onDragOver={(e) => {
                      if (drag?.platform === q.platform) e.preventDefault();
                    }}
                    onDrop={() => {
                      if (drag?.platform === q.platform && drag.index !== i) onReorder(moveInList(ids, drag.index, i));
                      setDrag(null);
                    }}
                    handlers={handlers}
                  />
                ))}
              </div>
            )}

            {q.failed.length > 0 && (
              <div className="mt-4 border-t border-white/[0.05] pt-3">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-red-400/70">
                  <AlertTriangle size={11} /> Failed · {q.failed.length}
                </div>
                <div className="flex flex-col gap-2">
                  {q.failed.map((ev, i) => (
                    <QueueCard key={ev.id} event={ev} order={i + 1} draggable={false} busy={busyId === ev.id} handlers={handlers} />
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
