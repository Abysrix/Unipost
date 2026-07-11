"use client";

import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformId } from "@/config/platforms";
import type { PostMedia } from "@/types/post";
import { analyzeMediaForPost } from "@/app/(app)/create/ai-actions";

interface Props {
  media: PostMedia[];
  platforms: PlatformId[];
  title: string;
  content: string;
  onApply: (title: string, content: string) => void;
}

type State = "idle" | "loading" | "done" | "error";

export default function AIWriteButton({ media, platforms, title, content, onApply }: Props) {
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleClick = async () => {
    if (state === "loading") return;
    setState("loading");
    setErrorMsg("");

    const res = await analyzeMediaForPost(media, platforms, title, content);

    if (res.ok) {
      onApply(res.result.title, res.result.content);
      setState("done");
      // Reset back to idle after a short celebration
      setTimeout(() => setState("idle"), 3000);
    } else {
      setErrorMsg(res.error);
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  };

  const icons: Record<State, React.ReactNode> = {
    idle: <Sparkles size={14} className="text-aurora-teal" />,
    loading: <Loader2 size={14} className="animate-spin text-aurora-teal" />,
    done: <CheckCircle2 size={14} className="text-emerald-400" />,
    error: <AlertCircle size={14} className="text-red-400" />,
  };

  const labels: Record<State, string> = {
    idle: "AI Write",
    loading: "Analyzing…",
    done: "Applied!",
    error: "Failed",
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={state === "loading"}
        data-cursor="pointer"
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200",
          state === "idle" &&
            "border-aurora-teal/30 bg-aurora-teal/[0.08] text-aurora-teal hover:border-aurora-teal/50 hover:bg-aurora-teal/[0.14]",
          state === "loading" &&
            "border-aurora-teal/20 bg-aurora-teal/[0.05] text-aurora-teal/70",
          state === "done" &&
            "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400",
          state === "error" &&
            "border-red-500/30 bg-red-500/[0.08] text-red-400",
        )}
      >
        {icons[state]}
        {labels[state]}
      </button>

      {state === "error" && errorMsg && (
        <p className="max-w-[220px] text-right text-[11px] text-red-400/80">{errorMsg}</p>
      )}

      {state === "loading" && (
        <p className="text-[11px] text-white/40">
          {media.length > 0 ? "Reading your media…" : "Generating content…"}
        </p>
      )}
    </div>
  );
}
