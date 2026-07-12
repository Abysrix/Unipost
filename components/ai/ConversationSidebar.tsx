"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Search, Pin, PinOff, Pencil, Trash2, MoreHorizontal, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIConversation } from "@/types/ai";

export default function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onPin,
  onDelete,
}: {
  conversations: AIConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuId) return;
    const onDown = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenuId(null);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuId]);

  const filtered = conversations.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex max-h-56 flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] lg:max-h-none lg:h-full">
      <div className="border-b border-white/[0.05] p-3">
        <button onClick={onNew} className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-black [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">
          <Plus size={15} /> New chat
        </button>
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5">
          <Search size={13} className="text-white/30" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chats" aria-label="Search conversations" className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2" data-lenis-prevent>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-white/30">
            <MessageSquare size={18} />
            <span className="text-xs">{query ? "No matches" : "No conversations yet"}</span>
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {filtered.map((c) => (
              <li key={c.id} className="group relative">
                <button
                  onClick={() => onSelect(c.id)}
                  className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors", activeId === c.id ? "bg-aurora-teal/10 text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white/90")}
                >
                  {c.pinned ? <Pin size={12} className="shrink-0 text-aurora-teal" /> : <MessageSquare size={12} className="shrink-0 text-white/25" />}
                  <span className="min-w-0 flex-1 truncate">{c.title}</span>
                </button>
                <button
                  onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                  aria-label="Conversation options"
                  className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-white/30 opacity-0 transition-opacity hover:bg-white/[0.08] hover:text-white group-hover:opacity-100"
                >
                  <MoreHorizontal size={14} />
                </button>
                {menuId === c.id && (
                  <div ref={menuRef} className="absolute right-1 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border border-white/[0.1] bg-bg-secondary p-1 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                    <button onClick={() => { onPin(c.id, !c.pinned); setMenuId(null); }} className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-[13px] text-white/70 hover:bg-white/[0.05] hover:text-white">
                      {c.pinned ? <PinOff size={13} /> : <Pin size={13} />} {c.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      onClick={() => {
                        const t = window.prompt("Rename conversation", c.title);
                        if (t && t.trim()) onRename(c.id, t.trim());
                        setMenuId(null);
                      }}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-[13px] text-white/70 hover:bg-white/[0.05] hover:text-white"
                    >
                      <Pencil size={13} /> Rename
                    </button>
                    <button onClick={() => { if (window.confirm("Delete this conversation?")) onDelete(c.id); setMenuId(null); }} className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-[13px] text-red-300/80 hover:bg-red-500/10">
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
