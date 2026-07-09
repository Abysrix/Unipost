"use client";

import { useEffect, useRef } from "react";
import EditorToolbar from "./EditorToolbar";
import CharacterCounter from "./CharacterCounter";
import WordCounter from "./WordCounter";
import AISelectionMenu from "./AISelectionMenu";

/** The post composer — title, toolbar, auto-growing content field, live counters. */
export default function PostEditor({
  title,
  content,
  onTitleChange,
  onContentChange,
  charLimit,
  onAddMedia,
}: {
  title: string;
  content: string;
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
  charLimit: number | null;
  onAddMedia?: () => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const pendingCursor = useRef<number | null>(null);

  // Auto-grow the textarea to fit content.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.max(ta.scrollHeight, 240)}px`;
  }, [content]);

  // Restore caret after a programmatic (emoji/hashtag) insert.
  useEffect(() => {
    if (pendingCursor.current != null && taRef.current) {
      taRef.current.focus();
      taRef.current.setSelectionRange(pendingCursor.current, pendingCursor.current);
      pendingCursor.current = null;
    }
  }, [content]);

  // Autofocus on mount (Phase 7).
  useEffect(() => {
    taRef.current?.focus();
  }, []);

  const insertAtCursor = (text: string) => {
    const ta = taRef.current;
    const start = ta ? ta.selectionStart : content.length;
    const end = ta ? ta.selectionEnd : content.length;
    pendingCursor.current = start + text.length;
    onContentChange(content.slice(0, start) + text + content.slice(end));
  };

  // Replace an arbitrary range (used by the AI selection menu), restoring the caret.
  const applyAIEdit = (start: number, end: number, text: string) => {
    pendingCursor.current = start + text.length;
    onContentChange(content.slice(0, start) + text + content.slice(end));
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Untitled post"
        aria-label="Post title"
        maxLength={200}
        className="w-full bg-transparent px-4 pt-4 font-display text-xl font-bold text-white outline-none placeholder:text-white/25"
      />

      <EditorToolbar onInsert={insertAtCursor} onAddMedia={onAddMedia} />

      <textarea
        ref={taRef}
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder="What do you want to share?"
        aria-label="Post content"
        className="w-full resize-none bg-transparent px-4 py-4 text-[15px] leading-relaxed text-white/85 outline-none placeholder:text-white/25"
        style={{ minHeight: 240 }}
      />

      <AISelectionMenu textareaRef={taRef} onApply={applyAIEdit} />

      <div className="flex items-center justify-between border-t border-white/[0.05] px-4 py-2.5">
        <WordCounter text={content} />
        <CharacterCounter count={content.length} limit={charLimit} />
      </div>
    </div>
  );
}
