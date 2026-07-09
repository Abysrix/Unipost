"use client";

import { useMemo, useState } from "react";
import { Search, Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toCsv, downloadCsv } from "@/lib/admin/csv";
import type { AuditCategory, AuditLogRow } from "@/types/admin";
import EmptyState from "@/components/dashboard/EmptyState";

const CATEGORIES: (AuditCategory | "all")[] = ["all", "auth", "role_change", "admin_action", "security", "api_error"];

const CATEGORY_COLOR: Record<AuditCategory, string> = {
  auth: "#22d3ee",
  role_change: "#facc15",
  admin_action: "#a78bfa",
  security: "#f87171",
  api_error: "#fb923c",
};

/** Raw, searchable, filterable, exportable audit_logs table — distinct from AuditTimeline's mixed-source narrative view. */
export default function LogViewer({ logs }: { logs: AuditLogRow[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<AuditCategory | "all">("all");

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (category !== "all" && l.category !== category) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = `${l.event_type} ${l.message ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, query, category]);

  function exportCsv() {
    const csv = toCsv(filtered, [
      { key: "created_at", label: "Time" },
      { key: "category", label: "Category" },
      { key: "event_type", label: "Event" },
      { key: "message", label: "Message" },
      { key: "actor_id", label: "Actor" },
      { key: "target_id", label: "Target" },
      { key: "ip_address", label: "IP" },
    ]);
    downloadCsv(`unipost-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
          <Search size={14} className="text-white/30" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search event or message" aria-label="Search audit logs" className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-colors", category === c ? "bg-white/[0.12] text-white" : "text-white/45 hover:text-white/70")}
            >
              {c.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-3 py-2 text-[12px] font-medium text-white/75 transition-colors hover:border-white/25">
          <Download size={13} /> Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState compact icon={FileText} title="No matching logs" description="Try a different search term or category." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02] text-[11px] uppercase tracking-wider text-white/40">
                <th className="px-3 py-3">Time</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Event</th>
                <th className="px-3 py-3">Message</th>
                <th className="px-3 py-3">Actor</th>
                <th className="px-3 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.015]">
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-white/40">{new Date(l.created_at).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium capitalize" style={{ background: `${CATEGORY_COLOR[l.category]}1f`, color: CATEGORY_COLOR[l.category] }}>{l.category.replace(/_/g, " ")}</span>
                  </td>
                  <td className="px-3 py-2.5 capitalize text-white/80">{l.event_type.replace(/_/g, " ")}</td>
                  <td className="max-w-[280px] truncate px-3 py-2.5 text-white/50">{l.message ?? "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-white/35">{l.actor_id ? `${l.actor_id.slice(0, 8)}…` : "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-white/35">{l.ip_address ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[11px] text-white/25">Showing {filtered.length} of {logs.length} loaded logs.</p>
    </div>
  );
}
