"use client";

import { useState } from "react";
import { Copy, Check, RefreshCw, Sparkles, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import StreamingText from "./StreamingText";

/** One chat message. User = right bubble; assistant = avatar + markdown + actions. */
export default function AIMessage({
  role,
  content,
  streaming = false,
  isLast = false,
  onRegenerate,
  onInsert,
}: {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  isLast?: boolean;
  onRegenerate?: () => void;
  onInsert?: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-white/[0.06] px-4 py-2.5 text-[14px] text-white/85">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg [background:linear-gradient(120deg,#22d3ee,#34d399)]">
        <Sparkles size={13} className="text-black/80" />
      </span>
      <div className="group min-w-0 flex-1">
        <StreamingText content={content} streaming={streaming} />
        {!streaming && content && (
          <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button onClick={copy} className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white/80">
              {copied ? <Check size={12} className="text-aurora-green" /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
            </button>
            {onInsert && (
              <button onClick={() => onInsert(content)} className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white/80">
                <Plus size={12} /> Insert
              </button>
            )}
            {isLast && onRegenerate && (
              <button onClick={onRegenerate} className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white/80")}>
                <RefreshCw size={12} /> Regenerate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
