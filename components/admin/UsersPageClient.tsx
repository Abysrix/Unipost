"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Download, Ban, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import type { Role, Plan } from "@/lib/auth/role";
import type { AdminUserRow } from "@/types/admin";
import { toCsv, downloadCsv } from "@/lib/admin/csv";
import { suspendUserAction, reactivateUserAction } from "@/app/(app)/admin/actions";
import UserTable from "./UserTable";
import BulkActionBar from "./BulkActionBar";

const ROLES: Role[] = ["creator", "admin"];
const PLANS: Plan[] = ["free", "pro", "agency"];

/**
 * Search/filter/bulk-actions for the user directory. Deletion is deliberately
 * NOT available here — bulk-deleting accounts from a list is too dangerous;
 * that irreversible action lives on the single-user detail page instead,
 * behind its own typed-confirmation modal.
 */
export default function UsersPageClient({ initialUsers, total }: { initialUsers: AdminUserRow[]; total: number }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [plan, setPlan] = useState<Plan | "">("");
  const [status, setStatus] = useState<"active" | "banned" | "">("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    return initialUsers.filter((u) => {
      if (query && !u.email.toLowerCase().includes(query.toLowerCase()) && !u.displayName.toLowerCase().includes(query.toLowerCase())) return false;
      if (role && u.role !== role) return false;
      if (plan && u.plan !== plan) return false;
      if (status === "banned" && !u.banned) return false;
      if (status === "active" && u.banned) return false;
      return true;
    });
  }, [initialUsers, query, role, plan, status]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((u) => u.id))));
  }

  async function bulkSuspend() {
    setBusy(true);
    await Promise.all([...selected].map((id) => suspendUserAction(id)));
    setBusy(false);
    setSelected(new Set());
    startTransition(() => router.refresh());
  }
  async function bulkReactivate() {
    setBusy(true);
    await Promise.all([...selected].map((id) => reactivateUserAction(id)));
    setBusy(false);
    setSelected(new Set());
    startTransition(() => router.refresh());
  }

  function exportCsv() {
    const csv = toCsv(filtered, [
      { key: "email", label: "Email" },
      { key: "displayName", label: "Name" },
      { key: "role", label: "Role" },
      { key: "plan", label: "Plan" },
      { key: "subscriptionStatus", label: "Subscription status" },
      { key: "creditsRemaining", label: "AI credits" },
      { key: "connectedAccounts", label: "Connected accounts" },
      { key: "creatorScore", label: "Creator score" },
      { key: "banned", label: "Suspended" },
      { key: "createdAt", label: "Joined" },
      { key: "lastSignInAt", label: "Last sign-in" },
    ]);
    downloadCsv(`unipost-users-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
          <Search size={14} className="text-white/30" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" aria-label="Search users" className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25" />
        </div>
        <select value={role} onChange={(e) => setRole(e.target.value as Role | "")} aria-label="Filter by role" className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[13px] text-white outline-none [color-scheme:dark]">
          <option value="" className="bg-bg-secondary">All roles</option>
          {ROLES.map((r) => <option key={r} value={r} className="bg-bg-secondary">{r}</option>)}
        </select>
        <select value={plan} onChange={(e) => setPlan(e.target.value as Plan | "")} aria-label="Filter by plan" className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[13px] text-white outline-none [color-scheme:dark]">
          <option value="" className="bg-bg-secondary">All plans</option>
          {PLANS.map((p) => <option key={p} value={p} className="bg-bg-secondary">{p}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as "active" | "banned" | "")} aria-label="Filter by status" className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[13px] text-white outline-none [color-scheme:dark]">
          <option value="" className="bg-bg-secondary">Any status</option>
          <option value="active" className="bg-bg-secondary">Active</option>
          <option value="banned" className="bg-bg-secondary">Suspended</option>
        </select>
        <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3 py-2 text-[13px] font-medium text-white/75 transition-colors hover:border-white/25 hover:text-white">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <BulkActionBar count={selected.size} onClear={() => setSelected(new Set())}>
        <button onClick={bulkSuspend} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-3 py-1.5 text-[12px] font-medium text-white/75 hover:border-white/25 disabled:opacity-50">
          <Ban size={12} /> Suspend
        </button>
        <button onClick={bulkReactivate} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-3 py-1.5 text-[12px] font-medium text-white/75 hover:border-white/25 disabled:opacity-50">
          <RotateCcw size={12} /> Reactivate
        </button>
      </BulkActionBar>

      <UserTable users={filtered} selected={selected} onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll} />

      <div className="mt-3 flex items-center justify-between text-[12px] text-white/40">
        <span>{filtered.length} of {total} users loaded</span>
        <span className="flex items-center gap-2 text-white/25">
          <ChevronLeft size={13} /> Loaded up to 1,000 most recent <ChevronRight size={13} />
        </span>
      </div>
    </div>
  );
}
