"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, PenSquare, Eye, Globe, Lock, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import WidgetContainer from "@/components/dashboard/WidgetContainer";
import { validateForPlatforms, tightestLimit } from "@/lib/validations/post";
import type { Post, PostInput, PostMedia, PostVisibility } from "@/types/post";
import type { PlatformId } from "@/config/platforms";
import { saveDraft, deleteDraft, duplicateDraft } from "@/app/(app)/create/actions";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import PostEditor from "./PostEditor";
import PlatformSelector from "./PlatformSelector";
import MediaUploader, { type MediaUploaderHandle } from "./MediaUploader";
import ContentCard from "./ContentCard";
import PostActions from "./PostActions";
import ValidationMessage from "./ValidationMessage";
import SaveIndicator, { type SaveStatus } from "./SaveIndicator";
import ScheduleModal from "@/components/schedule/ScheduleModal";

const VISIBILITY: { value: PostVisibility; label: string; icon: typeof Globe }[] = [
  { value: "public", label: "Public", icon: Globe },
  { value: "unlisted", label: "Unlisted", icon: EyeOff },
  { value: "private", label: "Private", icon: Lock },
];

export default function CreateStudio({
  initial,
  userId,
  authorName,
}: {
  initial: Post | null;
  userId: string;
  authorName: string;
}) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(initial?.id ?? null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [platforms, setPlatforms] = useState<PlatformId[]>(initial?.platforms ?? []);
  const [media, setMedia] = useState<PostMedia[]>(initial?.media ?? []);
  const [visibility, setVisibility] = useState<PostVisibility>(initial?.visibility ?? "public");
  const [status, setStatus] = useState<SaveStatus>(initial ? "saved" : "idle");
  const [lastEdited, setLastEdited] = useState<string | null>(initial?.updated_at ?? null);
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState<"compose" | "preview">("compose");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [preparingSchedule, setPreparingSchedule] = useState(false);

  const mediaRef = useRef<MediaUploaderHandle>(null);
  const idRef = useRef<string | null>(id);
  const latest = useRef<PostInput>({ title, content, platforms, media, visibility });
  latest.current = { title, content, platforms, media, visibility };

  const saveNow = useCallback(async () => {
    setStatus("saving");
    const res = await saveDraft(idRef.current, latest.current);
    if ("error" in res) {
      setStatus("error");
      return;
    }
    if (!idRef.current) {
      idRef.current = res.id;
      setId(res.id);
      window.history.replaceState(null, "", `/create?id=${res.id}`);
    }
    setLastEdited(res.updatedAt);
    setStatus("saved");
    setDirty(false);
  }, []);

  const debounced = useDebouncedCallback(() => void saveNow(), 1200);

  const markChanged = useCallback(() => {
    setDirty(true);
    setStatus("idle");
    debounced.run();
  }, [debounced]);

  // Ctrl/Cmd + S → save immediately.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        debounced.cancel();
        void saveNow();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [debounced, saveNow]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const onDelete = async () => {
    if (!idRef.current) return router.push("/posts");
    if (!window.confirm("Delete this draft? You can restore it from Trash.")) return;
    await deleteDraft(idRef.current);
    router.push("/posts");
  };
  const onDuplicate = async () => {
    if (!idRef.current) return;
    const res = await duplicateDraft(idRef.current);
    if (res.id) router.push(`/create?id=${res.id}`);
  };

  // Scheduling needs a saved post_id — save first (if new or dirty), then open the modal.
  const onSchedule = async () => {
    setPreparingSchedule(true);
    debounced.cancel();
    if (!idRef.current || dirty) await saveNow();
    setPreparingSchedule(false);
    if (idRef.current) setScheduleOpen(true);
  };

  const validations = validateForPlatforms(content, media, platforms);
  const limit = tightestLimit(platforms);
  const isNew = !id;

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Top toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/posts" aria-label="Back to posts" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-white/60 transition-colors hover:border-white/20 hover:text-white">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-2">
            <PenSquare size={18} className="text-aurora-teal" />
            <h1 className="font-display text-xl font-bold text-white">{isNew ? "Create post" : "Edit draft"}</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <SaveIndicator status={status} lastEdited={lastEdited} dirty={dirty} />
          <div className="flex rounded-full border border-white/[0.08] bg-white/[0.02] p-0.5">
            {(["compose", "preview"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors", view === v ? "bg-white/[0.08] text-white" : "text-white/45 hover:text-white/80")}
              >
                {v === "preview" && <Eye size={13} />}
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Editor / Preview */}
        <div>
          {view === "compose" ? (
            <>
              <PostEditor
                title={title}
                content={content}
                onTitleChange={(v) => { setTitle(v); markChanged(); }}
                onContentChange={(v) => { setContent(v); markChanged(); }}
                charLimit={limit}
                onAddMedia={() => mediaRef.current?.open()}
              />
              {validations.some((v) => !v.ok) && (
                <div className="mt-3 space-y-1.5 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3">
                  {validations.map((v) => <ValidationMessage key={v.platform} v={v} />)}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {platforms.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-16 text-center text-sm text-white/40">
                  Select a platform to see how your post will look.
                </div>
              ) : (
                platforms.map((p) => (
                  <ContentCard key={p} platform={p} authorName={authorName} title={title} content={content} media={media} />
                ))
              )}
            </div>
          )}

          <div className="mt-6">
            <PostActions
              isNew={isNew}
              saving={status === "saving"}
              scheduling={preparingSchedule}
              onSave={() => { debounced.cancel(); void saveNow(); }}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onSchedule={() => void onSchedule()}
            />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          <WidgetContainer title="Publish to">
            <PlatformSelector selected={platforms} onChange={(p) => { setPlatforms(p); markChanged(); }} />
          </WidgetContainer>

          <WidgetContainer title="Media">
            <MediaUploader ref={mediaRef} userId={userId} media={media} onChange={(m) => { setMedia(m); markChanged(); }} />
          </WidgetContainer>

          <WidgetContainer title="Visibility">
            <div className="grid grid-cols-3 gap-2">
              {VISIBILITY.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => { setVisibility(value); markChanged(); }}
                  aria-pressed={visibility === value}
                  className={cn("flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[11px] font-medium transition-colors", visibility === value ? "border-aurora-teal/40 bg-aurora-teal/[0.08] text-white" : "border-white/[0.07] text-white/50 hover:border-white/15 hover:text-white/80")}
                >
                  <Icon size={15} className={visibility === value ? "text-aurora-teal" : ""} />
                  {label}
                </button>
              ))}
            </div>
          </WidgetContainer>
        </aside>
      </div>

      {scheduleOpen && idRef.current && (
        <ScheduleModal
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          post={{ id: idRef.current, title, content, media, platforms }}
          onScheduled={() => router.push("/calendar")}
        />
      )}
    </div>
  );
}
