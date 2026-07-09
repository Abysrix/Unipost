"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { runAction } from "@/app/(app)/ai/actions";
import type { AIActionId, ActionInput } from "@/lib/ai/prompts";

type Mode = "replace" | "after";
const EDITOR_ACTIONS: { id: AIActionId; label: string; mode: Mode; extra?: Partial<ActionInput> }[] = [
  { id: "improve", label: "Improve writing", mode: "replace" },
  { id: "rewrite", label: "Rewrite", mode: "replace" },
  { id: "shorten", label: "Make shorter", mode: "replace" },
  { id: "expand", label: "Make longer", mode: "replace" },
  { id: "grammar", label: "Fix grammar", mode: "replace" },
  { id: "emoji", label: "Add emojis", mode: "replace" },
  { id: "translate", label: "Translate → Hindi", mode: "replace", extra: { language: "Hindi" } },
  { id: "hashtags", label: "Add hashtags", mode: "after" },
];

type Selection = { text: string; start: number; end: number };

/**
 * Floating "Ask AI" menu for the post editor. Highlight text in the textarea to
 * reveal it, pick an action, and the selection is replaced (or appended to) with
 * the AI result. Every run is also saved to AI history.
 */
export default function AISelectionMenu({
  textareaRef,
  onApply,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onApply: (start: number, end: number, text: string) => void;
}) {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [sel, setSel] = useState<Selection | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<AIActionId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setAnchor(null);
    setSel(null);
    setOpen(false);
    setBusy(null);
    setError(null);
  }, []);

  // Reveal on mouse-up selection inside the textarea.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const onMouseUp = (e: MouseEvent) => {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const text = ta.value.slice(start, end).trim();
      if (end > start && text) {
        setSel({ text: ta.value.slice(start, end), start, end });
        setAnchor({ x: e.clientX, y: e.clientY });
        setOpen(false);
        setError(null);
      } else {
        close();
      }
    };
    ta.addEventListener("mouseup", onMouseUp);
    return () => ta.removeEventListener("mouseup", onMouseUp);
  }, [textareaRef, close]);

  // Dismiss on outside click or scroll (coords go stale on scroll).
  useEffect(() => {
    if (!anchor) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node) && e.target !== textareaRef.current) close();
    };
    const onScroll = () => busy === null && close();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [anchor, busy, close, textareaRef]);

  if (!anchor || !sel) return null;

  async function run(action: (typeof EDITOR_ACTIONS)[number]) {
    if (!sel || busy) return;
    setBusy(action.id);
    setError(null);
    const input: ActionInput = { text: sel.text, ...(action.extra ?? {}) };
    const res = await runAction(action.id, input);
    if ("error" in res) {
      setError(res.error);
      setBusy(null);
      return;
    }
    const output = res.output.trim();
    if (action.mode === "after") onApply(sel.end, sel.end, `\n\n${output}`);
    else onApply(sel.start, sel.end, output);
    close();
  }

  // Keep the popover on-screen horizontally; render it just below the cursor.
  const left = Math.min(Math.max(anchor.x, 12), (typeof window !== "undefined" ? window.innerWidth : 1200) - 236);
  const top = anchor.y + 12;

  return (
    <div
      ref={rootRef}
      onMouseDown={(e) => e.preventDefault()}
      style={{ left, top }}
      className="fixed z-50 w-56 overflow-hidden rounded-xl border border-white/[0.1] bg-bg-secondary shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
    >
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-semibold text-white"
        >
          <Sparkles size={15} className="text-aurora-teal" /> Ask AI
        </button>
      ) : (
        <div className="p-1.5">
          <p className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white/35">Edit selection</p>
          {EDITOR_ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => void run(a)}
              disabled={busy !== null}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-white/75 transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
            >
              {a.label}
              {busy === a.id && <Loader2 size={13} className="animate-spin text-aurora-teal" />}
            </button>
          ))}
          {error && <p className="px-2.5 py-1.5 text-[11px] text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
