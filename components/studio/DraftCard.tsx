"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Trash2, PenSquare, RotateCcw, Loader2, FileText } from "lucide-react";
import { getPlatform } from "@/config/platforms";
import { timeAgo, cn } from "@/lib/utils";
import type { Post } from "@/types/post";
import { duplicateDraft, deleteDraft, restoreDraft, permanentlyDeleteDraft } from "@/app/(app)/create/actions";

/** A draft in the list. `trashed` swaps the actions to Restore / Delete-forever. */
export default function DraftCard({ post, trashed = false }: { post: Post; trashed?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "dup" | "del" | "restore">(null);

  const excerpt = post.content.trim();

  const dup = async () => {
    setBusy("dup");
    const r = await duplicateDraft(post.id);
    if (r.id) router.push(`/create?id=${r.id}`);
    else { setBusy(null); router.refresh(); }
  };
  const del = async () => {
    if (!window.confirm("Move this draft to Trash?")) return;
    setBusy("del");
    await deleteDraft(post.id);
    router.refresh();
  };
  const restore = async () => {
    setBusy("restore");
    await restoreDraft(post.id);
    router.refresh();
  };
  const purge = async () => {
    if (!window.confirm("Permanently delete this draft? This cannot be undone.")) return;
    setBusy("del");
    await permanentlyDeleteDraft(post.id);
    router.refresh();
  };

  const iconBtn = "flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-white/50 transition-colors hover:border-white/20 hover:text-white disabled:opacity-50";

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.14]">
      <Link href={trashed ? "#" : `/create?id=${post.id}`} className={cn("flex-1", trashed && "pointer-events-none")}>
        <h3 className="truncate font-display text-base font-semibold text-white">{post.title || "Untitled post"}</h3>
        {excerpt ? (
          <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-white/45">{excerpt}</p>
        ) : (
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] italic text-white/25"><FileText size={13} /> Empty draft</p>
        )}
      </Link>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {post.platforms.length ? (
            post.platforms.slice(0, 5).map((id) => {
              const p = getPlatform(id);
              return (
                <span key={id} className="flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold" style={{ background: `${p?.color}22`, color: p?.color }} title={p?.name}>
                  {p?.glyph}
                </span>
              );
            })
          ) : (
            <span className="text-[11px] text-white/25">No platforms</span>
          )}
        </div>
        <span className="shrink-0 text-[11px] text-white/30">{timeAgo(trashed ? post.deleted_at ?? post.updated_at : post.updated_at)}</span>
      </div>

      <div className="mt-4 flex items-center gap-1.5 border-t border-white/[0.05] pt-3">
        {trashed ? (
          <>
            <button onClick={restore} disabled={busy !== null} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-aurora-teal/25 bg-aurora-teal/[0.08] py-1.5 text-xs font-medium text-aurora-teal transition-colors hover:bg-aurora-teal/[0.14]">
              {busy === "restore" ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Restore
            </button>
            <button onClick={purge} disabled={busy !== null} aria-label="Delete forever" className={cn(iconBtn, "hover:border-red-500/40 hover:text-red-400")}>
              {busy === "del" ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </>
        ) : (
          <>
            <Link href={`/create?id=${post.id}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/[0.1] py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white">
              <PenSquare size={13} /> Edit
            </Link>
            <button onClick={dup} disabled={busy !== null} aria-label="Duplicate" className={iconBtn}>
              {busy === "dup" ? <Loader2 size={13} className="animate-spin" /> : <Copy size={14} />}
            </button>
            <button onClick={del} disabled={busy !== null} aria-label="Delete" className={cn(iconBtn, "hover:border-red-500/40 hover:text-red-400")}>
              {busy === "del" ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
