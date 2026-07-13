"use client";

import { useEffect, useRef, useState } from "react";
import { Smile, Hash, Image as ImageIcon } from "lucide-react";

const EMOJIS = ["😀", "😅", "🔥", "🚀", "✨", "💡", "🎯", "📈", "🙌", "👀", "❤️", "🎉", "💬", "✅", "⚡", "🧵"];

/**
 * Editor toolbar — emoji picker + hashtag insert + media shortcut. AI writing
 * lives in AIWriteButton/AISelectionMenu (highlight-to-Ask-AI) elsewhere on
 * this same screen — a disabled Sparkles button here that used to say "AI
 * writing — coming in a later sprint" was stale now that it's real, and
 * confusingly contradicted the working AI features right next to it.
 */
export default function EditorToolbar({
  onInsert,
  onAddMedia,
}: {
  onInsert: (text: string) => void;
  onAddMedia?: () => void;
}) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!emojiOpen) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setEmojiOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [emojiOpen]);

  const btn = "flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white";

  return (
    <div className="flex items-center gap-1 border-b border-white/[0.05] px-2 py-1.5">
      <div ref={ref} className="relative">
        <button type="button" onClick={() => setEmojiOpen((o) => !o)} className={btn} aria-label="Insert emoji" aria-expanded={emojiOpen} data-cursor="pointer">
          <Smile size={16} />
        </button>
        {emojiOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 grid w-56 grid-cols-8 gap-0.5 rounded-xl border border-white/[0.1] bg-bg-secondary p-2 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => { onInsert(e); setEmojiOpen(false); }} className="flex h-6 w-6 items-center justify-center rounded text-base hover:bg-white/[0.08]">
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      <button type="button" onClick={() => onInsert("#")} className={btn} aria-label="Insert hashtag" data-cursor="pointer">
        <Hash size={16} />
      </button>

      {onAddMedia && (
        <button type="button" onClick={onAddMedia} className={btn} aria-label="Add media" data-cursor="pointer">
          <ImageIcon size={16} />
        </button>
      )}
    </div>
  );
}
