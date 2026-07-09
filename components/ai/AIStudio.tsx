"use client";

import { useRef, useState } from "react";
import { MessageSquare, LayoutTemplate, BookMarked, History, Plus, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_MODEL, type ModelId } from "@/lib/ai/models";
import { AI_TEMPLATES, TEMPLATE_CATEGORIES } from "@/lib/ai/templates";
import type { AIConversation, SavedPrompt, AIGeneration } from "@/types/ai";
import * as actions from "@/app/(app)/ai/actions";
import EmptyState from "@/components/dashboard/EmptyState";
import ConversationSidebar from "./ConversationSidebar";
import AIChat, { type ChatMsg } from "./AIChat";
import TemplateCard from "./TemplateCard";
import PromptCard from "./PromptCard";
import GenerationHistory from "./GenerationHistory";

type Tab = "chat" | "templates" | "prompts" | "history";
const TABS: { id: Tab; label: string; icon: typeof MessageSquare }[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "prompts", label: "Prompts", icon: BookMarked },
  { id: "history", label: "History", icon: History },
];
const PROMPT_CATEGORIES = ["General", "Instagram", "LinkedIn", "X", "YouTube", "Growth", "Marketing"];
const rid = () => Math.random().toString(36).slice(2);

function newConversation(id: string, title: string): AIConversation {
  const now = new Date().toISOString();
  return { id, user_id: "", title: title.slice(0, 80) || "New chat", pinned: false, created_at: now, updated_at: now, last_message_at: now };
}

/** Sort helper mirroring the server order: pinned first, then most recent. */
function sortConversations(list: AIConversation[]): AIConversation[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.last_message_at.localeCompare(a.last_message_at);
  });
}

export default function AIStudio({
  initialConversations,
  initialPrompts,
  initialGenerations,
  initialPrompt,
}: {
  initialConversations: AIConversation[];
  initialPrompts: SavedPrompt[];
  initialGenerations: AIGeneration[];
  /** Pre-fills the chat composer — e.g. from the Growth Coach's "Ask the coach" deep link. */
  initialPrompt?: string;
}) {
  const [tab, setTab] = useState<Tab>("chat");

  // Chat state (held locally so streaming + optimistic edits never fight router refreshes).
  const [conversations, setConversations] = useState<AIConversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState(initialPrompt ?? "");
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL);
  const abortRef = useRef<AbortController | null>(null);

  // Library + history state.
  const [prompts, setPrompts] = useState<SavedPrompt[]>(initialPrompts);
  const [generations, setGenerations] = useState<AIGeneration[]>(initialGenerations);

  /* ── Streaming ── */
  async function runStream(content: string, opts?: { regenerate?: boolean; appendUser?: boolean }) {
    const appendUser = opts?.appendUser ?? true;
    const asstId = rid();
    setMessages((m) => [
      ...m,
      ...(appendUser ? [{ id: rid(), role: "user" as const, content }] : []),
      { id: asstId, role: "assistant" as const, content: "" },
    ]);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const convAtStart = activeId;
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convAtStart, content, model, regenerate: opts?.regenerate ?? false }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error("Request failed");

      const convId = res.headers.get("x-conversation-id");
      if (convId && convId !== convAtStart) {
        setActiveId(convId);
        setConversations((cs) => (cs.some((c) => c.id === convId) ? cs : sortConversations([newConversation(convId, content), ...cs])));
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages((m) => m.map((msg) => (msg.id === asstId ? { ...msg, content: acc } : msg)));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages((m) => m.map((msg) => (msg.id === asstId && !msg.content ? { ...msg, content: "⚠ Something went wrong. Please try again." } : msg)));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function send() {
    const content = input.trim();
    if (!content || streaming) return;
    setInput("");
    void runStream(content);
  }
  function stop() {
    abortRef.current?.abort();
    setStreaming(false);
  }
  function regenerate() {
    if (streaming || !activeId) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((m) => {
      const copy = [...m];
      for (let i = copy.length - 1; i >= 0; i--) if (copy[i].role === "assistant") { copy.splice(i, 1); break; }
      return copy;
    });
    void runStream(lastUser.content, { regenerate: true, appendUser: false });
  }

  /* ── Conversation CRUD ── */
  async function selectConversation(id: string) {
    if (streaming) stop();
    setActiveId(id);
    const rows = await actions.getMessages(id);
    setMessages(rows.filter((r) => r.role !== "system").map((r) => ({ id: r.id, role: r.role === "assistant" ? "assistant" : "user", content: r.content })));
  }
  function newChat() {
    if (streaming) stop();
    setActiveId(null);
    setMessages([]);
    setTab("chat");
  }
  function renameConversation(id: string, title: string) {
    setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, title } : c)));
    void actions.renameConversation(id, title);
  }
  function pinConversation(id: string, pinned: boolean) {
    setConversations((cs) => sortConversations(cs.map((c) => (c.id === id ? { ...c, pinned } : c))));
    void actions.togglePinConversation(id, pinned);
  }
  function deleteConversation(id: string) {
    setConversations((cs) => cs.filter((c) => c.id !== id));
    if (activeId === id) newChat();
    void actions.deleteConversation(id);
  }

  /* ── Fill chat from a template / prompt / history item ── */
  function useText(text: string) {
    setInput(text);
    setTab("chat");
  }

  /* ── Prompt library ── */
  function favoritePrompt(id: string, favorite: boolean) {
    setPrompts((ps) => ps.map((p) => (p.id === id ? { ...p, favorite } : p)));
    void actions.togglePromptFavorite(id, favorite);
  }
  function removePrompt(id: string) {
    setPrompts((ps) => ps.filter((p) => p.id !== id));
    void actions.deletePrompt(id);
  }

  /* ── Generation history ── */
  function favoriteGeneration(id: string, favorite: boolean) {
    setGenerations((gs) => gs.map((g) => (g.id === id ? { ...g, favorite } : g)));
    void actions.toggleGenerationFavorite(id, favorite);
  }
  function removeGeneration(id: string) {
    setGenerations((gs) => gs.filter((g) => g.id !== id));
    void actions.removeGeneration(id);
  }

  return (
    <div>
      <nav role="tablist" aria-label="AI Studio sections" className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
              tab === t.id ? "bg-white/[0.07] text-white" : "text-white/50 hover:text-white/80",
            )}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </nav>

      {tab === "chat" && (
        <div className="grid gap-4 lg:h-[calc(100vh-15rem)] lg:grid-cols-[280px_1fr]">
          <ConversationSidebar
            conversations={conversations}
            activeId={activeId}
            onSelect={selectConversation}
            onNew={newChat}
            onRename={renameConversation}
            onPin={pinConversation}
            onDelete={deleteConversation}
          />
          <AIChat
            messages={messages}
            streaming={streaming}
            input={input}
            onInputChange={setInput}
            onSend={send}
            onStop={stop}
            onRegenerate={regenerate}
            onExample={setInput}
            model={model}
            onModelChange={setModel}
          />
        </div>
      )}

      {tab === "templates" && <TemplatesTab onUse={useText} />}

      {tab === "prompts" && (
        <PromptsTab
          prompts={prompts}
          onCreate={(p) => setPrompts((ps) => [p, ...ps])}
          onUse={useText}
          onFavorite={favoritePrompt}
          onDelete={removePrompt}
        />
      )}

      {tab === "history" && <GenerationHistory generations={generations} onFavorite={favoriteGeneration} onDelete={removeGeneration} onReuse={useText} />}
    </div>
  );
}

/* ────────────────────────────── Templates tab ────────────────────────────── */
function TemplatesTab({ onUse }: { onUse: (prompt: string) => void }) {
  const [cat, setCat] = useState<string>("All");
  const cats = ["All", ...TEMPLATE_CATEGORIES];
  const list = cat === "All" ? AI_TEMPLATES : AI_TEMPLATES.filter((t) => t.category === cat);
  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              cat === c ? "border-aurora-teal/40 bg-aurora-teal/10 text-white" : "border-white/[0.08] text-white/50 hover:text-white/80",
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((t) => (
          <TemplateCard key={t.id} template={t} onUse={onUse} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────── Prompts tab ─────────────────────────────── */
function PromptsTab({
  prompts,
  onCreate,
  onUse,
  onFavorite,
  onDelete,
}: {
  prompts: SavedPrompt[];
  onCreate: (p: SavedPrompt) => void;
  onUse: (body: string) => void;
  onFavorite: (id: string, favorite: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(PROMPT_CATEGORIES[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = prompts.filter(
    (p) => p.title.toLowerCase().includes(query.toLowerCase()) || p.body.toLowerCase().includes(query.toLowerCase()),
  );

  async function save() {
    setError(null);
    setSaving(true);
    const res = await actions.savePrompt({ title, body, category });
    setSaving(false);
    if (res.error || !res.id) {
      setError(res.error ?? "Could not save prompt.");
      return;
    }
    const now = new Date().toISOString();
    onCreate({ id: res.id, user_id: "", title: title.trim(), body: body.trim(), category, favorite: false, created_at: now, updated_at: now });
    setTitle("");
    setBody("");
    setCategory(PROMPT_CATEGORIES[0]);
    setOpen(false);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2">
          <Search size={14} className="text-white/30" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search prompts" aria-label="Search prompts" className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25" />
        </div>
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg border border-white/[0.1] px-3.5 py-2 text-sm font-medium text-white/80 transition-colors hover:border-white/25 hover:text-white">
          {open ? <X size={15} /> : <Plus size={15} />} {open ? "Cancel" : "New prompt"}
        </button>
      </div>

      {open && (
        <div className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Prompt title" aria-label="Prompt title" className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-aurora-teal/40" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Prompt category" className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white outline-none focus:border-aurora-teal/40">
              {PROMPT_CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-bg-secondary">{c}</option>
              ))}
            </select>
          </div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Your reusable prompt…" aria-label="Prompt body" rows={3} className="mt-3 w-full resize-y rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-aurora-teal/40" />
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <div className="mt-3 flex justify-end">
            <button onClick={save} disabled={saving} className="rounded-lg px-4 py-2 text-sm font-semibold text-black transition-opacity disabled:opacity-50 [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">
              {saving ? "Saving…" : "Save prompt"}
            </button>
          </div>
        </div>
      )}

      {prompts.length === 0 ? (
        <EmptyState icon={BookMarked} title="No saved prompts yet" description="Save prompts you reuse often and pull them into chat in one click." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <PromptCard key={p.id} prompt={p} onUse={onUse} onFavorite={onFavorite} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
