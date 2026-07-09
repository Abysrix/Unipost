"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Flag, Check, Trash2, Loader2, ShieldAlert } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { getPlatform } from "@/config/platforms";
import type { ModeratedPost } from "@/types/admin";
import { flagPostAction, unflagPostAction, adminDeletePostAction, bulkModerateAction } from "@/app/(app)/admin/actions";
import EmptyState from "@/components/dashboard/EmptyState";
import BulkActionBar from "./BulkActionBar";
import ConfirmDangerModal from "./ConfirmDangerModal";

export default function ModerationPageClient({ initialPosts }: { initialPosts: ModeratedPost[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ModeratedPost | null>(null);

  const filtered = useMemo(() => {
    return initialPosts.filter((p) => {
      if (flaggedOnly && !p.flagged) return false;
      if (query && !p.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [initialPosts, query, flaggedOnly]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function toggleFlag(post: ModeratedPost) {
    setBusyId(post.id);
    if (post.flagged) await unflagPostAction(post.id);
    else {
      const note = window.prompt("Reason for flagging (shown to other admins):");
      if (note === null) {
        setBusyId(null);
        return;
      }
      await flagPostAction(post.id, note || "Flagged");
    }
    setBusyId(null);
    startTransition(() => router.refresh());
  }

  async function bulkAction(action: "flag" | "unflag" | "delete") {
    setBusyId("bulk");
    await bulkModerateAction([...selected], action);
    setBusyId(null);
    setSelected(new Set());
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
          <Search size={14} className="text-white/30" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search post titles" aria-label="Search posts" className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25" />
        </div>
        <button
          onClick={() => setFlaggedOnly((v) => !v)}
          aria-pressed={flaggedOnly}
          className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors", flaggedOnly ? "border-red-400/40 bg-red-500/10 text-red-300" : "border-white/[0.1] text-white/70 hover:border-white/25")}
        >
          <Flag size={14} /> Flagged only
        </button>
      </div>

      <BulkActionBar count={selected.size} onClear={() => setSelected(new Set())}>
        <button onClick={() => bulkAction("flag")} disabled={busyId === "bulk"} className="flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-3 py-1.5 text-[12px] font-medium text-white/75 hover:border-white/25 disabled:opacity-50">
          <Flag size={12} /> Flag
        </button>
        <button onClick={() => bulkAction("unflag")} disabled={busyId === "bulk"} className="flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-3 py-1.5 text-[12px] font-medium text-white/75 hover:border-white/25 disabled:opacity-50">
          <Check size={12} /> Unflag
        </button>
        <button onClick={() => bulkAction("delete")} disabled={busyId === "bulk"} className="flex items-center gap-1.5 rounded-lg border border-red-500/25 px-3 py-1.5 text-[12px] font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50">
          <Trash2 size={12} /> Delete
        </button>
      </BulkActionBar>

      {filtered.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="Nothing to moderate" description="Flagged and recent posts across every user will show up here." />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((p) => {
            const platform = p.platforms[0] ? getPlatform(p.platforms[0] as never) : undefined;
            return (
              <div key={p.id} className={cn("flex items-center gap-3 rounded-xl border p-3", p.flagged ? "border-red-500/20 bg-red-500/[0.03]" : "border-white/[0.06] bg-white/[0.02]")}>
                <button onClick={() => toggleSelect(p.id)} aria-label={selected.has(p.id) ? `Deselect ${p.title || "post"}` : `Select ${p.title || "post"}`} className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", selected.has(p.id) ? "border-transparent bg-aurora-teal" : "border-white/20")}>
                  {selected.has(p.id) && <Check size={11} className="text-black" strokeWidth={3} />}
                </button>
                {platform && (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold" style={{ background: `${platform.color}22`, color: platform.color }}>{platform.glyph}</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-white/85">{p.title || "Untitled post"}</p>
                  <p className="text-[11px] text-white/35">
                    {p.status} · {timeAgo(p.created_at)}
                    {p.flagged && p.moderation_note && <span className="text-red-400"> · {p.moderation_note}</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button onClick={() => toggleFlag(p)} disabled={busyId === p.id} aria-label={p.flagged ? "Unflag post" : "Flag post"} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] text-white/50 transition-colors hover:border-white/25 hover:text-white disabled:opacity-50">
                    {busyId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Flag size={13} className={p.flagged ? "fill-red-400 text-red-400" : ""} />}
                  </button>
                  <button onClick={() => setDeleteTarget(p)} aria-label="Delete post" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDangerModal
          title="Delete post"
          description={`This soft-deletes "${deleteTarget.title || "Untitled post"}" — the owner can still restore it from their Trash. Use this for content that violates policy.`}
          confirmPhrase="DELETE"
          confirmLabel="Delete post"
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            const res = await adminDeletePostAction(deleteTarget.id, "Removed by admin moderation");
            if (res.error) throw new Error(res.error);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}
