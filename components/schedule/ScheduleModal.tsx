"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Loader2, Zap, Star, Check } from "lucide-react";
import Modal from "@/components/ui/Modal";
import PlatformSelector from "@/components/studio/PlatformSelector";
import { cn } from "@/lib/utils";
import type { PlatformId } from "@/config/platforms";
import type { Post, PostMedia } from "@/types/post";
import type { ScheduledEvent, ScheduledPost } from "@/types/schedule";
import { schedulePost } from "@/app/(app)/calendar/actions";
import { zonedWallTimeToUtcIso, formatDateTime, relativeTo, localTimezone, DEFAULT_TIMEZONE } from "@/lib/schedule/timezone";
import { defaultSlot, validateScheduleTime, suggestedTime } from "@/lib/schedule/scheduling";
import { toDateInputValue } from "@/lib/schedule/calendar";
import TimePicker from "./TimePicker";
import TimezoneSelector from "./TimezoneSelector";

type LockedPost = { id: string; title: string; content?: string; media?: PostMedia[]; platforms: PlatformId[] };

export default function ScheduleModal({
  open,
  onClose,
  post,
  drafts = [],
  defaultDate,
  onScheduled,
}: {
  open: boolean;
  onClose: () => void;
  /** When provided, schedules this specific post (from the editor). */
  post?: LockedPost;
  /** When no `post`, the user picks one or more of these drafts (bulk schedule). */
  drafts?: Post[];
  /** Preselected date (YYYY-MM-DD) e.g. from clicking a calendar day. */
  defaultDate?: string;
  onScheduled: (events: ScheduledEvent[]) => void;
}) {
  const slot = defaultSlot();
  const [selectedIds, setSelectedIds] = useState<string[]>(post ? [post.id] : drafts[0] ? [drafts[0].id] : []);
  const [platforms, setPlatforms] = useState<PlatformId[]>(post?.platforms ?? drafts[0]?.platforms ?? []);
  const [date, setDate] = useState(defaultDate ?? slot.date);
  const [time, setTime] = useState(slot.time);
  const [tz, setTz] = useState(localTimezone() || DEFAULT_TIMEZONE);
  const [priority, setPriority] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const activePosts: LockedPost[] = post ? [post] : selectedIds.map((id) => draftById(drafts, id)).filter((x): x is LockedPost => !!x);
  const bulk = activePosts.length > 1;

  const preview = useMemo(() => {
    try {
      const iso = zonedWallTimeToUtcIso(date, time, tz);
      return { iso, label: formatDateTime(iso, tz), rel: relativeTo(iso) };
    } catch {
      return null;
    }
  }, [date, time, tz]);

  function toggleDraft(id: string) {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      // Seed platforms from the first selection so single-picks keep prior UX.
      if (prev.length === 0 && next.length === 1) {
        const d = draftById(drafts, id);
        if (d) setPlatforms(d.platforms);
      }
      return next;
    });
  }

  function applySuggestedTime() {
    setTime(suggestedTime(platforms[0]));
  }

  async function submit() {
    setError(null);
    if (activePosts.length === 0) return setError("Pick at least one post to schedule.");
    if (platforms.length === 0) return setError("Pick at least one platform.");
    const timeErr = validateScheduleTime(date, time, tz);
    if (timeErr) return setError(timeErr);

    setBusy(true);
    const iso = zonedWallTimeToUtcIso(date, time, tz);
    const results = await Promise.all(
      activePosts.map((p) => schedulePost({ postId: p.id, platforms, scheduledTime: iso, timezone: tz, priority })),
    );
    setBusy(false);

    const failed = results.find((r) => "error" in r);
    if (failed && "error" in failed) return setError(bulk ? `${failed.error} (some posts may have scheduled — check the calendar)` : failed.error);

    const created: ScheduledEvent[] = [];
    results.forEach((res, i) => {
      if ("scheduled" in res) {
        const p = activePosts[i];
        const ref = { id: p.id, title: p.title || "Untitled post", content: p.content ?? "", media: p.media ?? [] };
        created.push(...(res.scheduled as ScheduledPost[]).map((sp) => ({ ...sp, post: ref })));
      }
    });
    onScheduled(created);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={bulk ? `Schedule ${activePosts.length} posts` : "Schedule post"}>
      <div className="space-y-5">
        {!post && (
          <Field label={drafts.length > 1 ? "Posts (select one or more)" : "Post"}>
            {drafts.length === 0 ? (
              <p className="text-sm text-white/40">No drafts yet — create one first.</p>
            ) : (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-white/[0.08] bg-white/[0.02] p-1.5">
                {drafts.map((d) => {
                  const checked = selectedIds.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDraft(d.id)}
                      aria-pressed={checked}
                      className={cn("flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors", checked ? "bg-aurora-teal/10 text-white" : "text-white/60 hover:bg-white/[0.04] hover:text-white/90")}
                    >
                      <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", checked ? "border-transparent bg-aurora-teal" : "border-white/20")}>
                        {checked && <Check size={11} className="text-black" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{d.title || "Untitled post"}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </Field>
        )}

        {post && (
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
            <p className="truncate text-sm font-medium text-white">{post.title || "Untitled post"}</p>
          </div>
        )}

        <Field label="Platforms">
          <PlatformSelector selected={platforms} onChange={setPlatforms} />
        </Field>

        <Field
          label="When"
          action={
            <button onClick={applySuggestedTime} type="button" className="flex items-center gap-1 text-[11px] font-medium text-aurora-teal hover:opacity-80">
              <Zap size={11} /> Best time
            </button>
          }
        >
          <div className="space-y-3">
            <TimePicker date={date} time={time} onDateChange={setDate} onTimeChange={setTime} minDate={toDateInputValue(new Date())} />
            <TimezoneSelector value={tz} onChange={setTz} />
          </div>
        </Field>

        {preview && (
          <div className="flex items-center gap-2 rounded-lg border border-aurora-teal/15 bg-aurora-teal/[0.05] px-3 py-2.5 text-[13px]">
            <CalendarClock size={15} className="shrink-0 text-aurora-teal" />
            <span className="text-white/80">{preview.label}</span>
            <span className="ml-auto shrink-0 font-mono text-[11px] text-aurora-teal">{preview.rel}</span>
          </div>
        )}

        <button onClick={() => setPriority((p) => !p)} type="button" aria-pressed={priority} className="flex items-center gap-2 text-[13px] text-white/60 hover:text-white/90">
          <span className={`flex h-4 w-4 items-center justify-center rounded ${priority ? "bg-aurora-yellow text-black" : "border border-white/20"}`}>
            {priority && <Star size={10} className="fill-current" />}
          </span>
          Mark as priority post{bulk ? "s" : ""}
        </button>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
          <button onClick={onClose} type="button" className="rounded-full border border-white/[0.12] px-5 py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white">
            Cancel
          </button>
          <button onClick={submit} disabled={busy || activePosts.length === 0} type="button" className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-black transition-opacity disabled:opacity-50 [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <CalendarClock size={15} />} {bulk ? `Schedule ${activePosts.length}` : "Schedule"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, action, children }: { label: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">{label}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function draftById(drafts: Post[], id: string): LockedPost | undefined {
  const d = drafts.find((x) => x.id === id);
  return d ? { id: d.id, title: d.title, content: d.content, media: d.media, platforms: d.platforms } : undefined;
}
