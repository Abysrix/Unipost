"use client";

import Link from "next/link";
import { Check, Ban } from "lucide-react";
import { cn, timeAgo, formatNumber } from "@/lib/utils";
import { planLimits } from "@/lib/billing/plans";
import type { AdminUserRow } from "@/types/admin";

const ROLE_COLOR: Record<string, string> = { admin: "#facc15", creator: "#2dd4bf" };

export default function UserTable({
  users,
  selected,
  onToggleSelect,
  onToggleSelectAll,
}: {
  users: AdminUserRow[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}) {
  const allSelected = users.length > 0 && users.every((u) => selected.has(u.id));

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
      <table className="w-full min-w-[820px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-white/[0.07] bg-white/[0.02] text-[11px] uppercase tracking-wider text-white/40">
            <th className="w-10 px-3 py-3">
              <button onClick={onToggleSelectAll} aria-label="Select all" className={cn("flex h-4 w-4 items-center justify-center rounded border", allSelected ? "border-transparent bg-aurora-teal" : "border-white/20")}>
                {allSelected && <Check size={11} className="text-black" strokeWidth={3} />}
              </button>
            </th>
            <th className="px-3 py-3">User</th>
            <th className="px-3 py-3">Role</th>
            <th className="px-3 py-3">Plan</th>
            <th className="px-3 py-3">Credits</th>
            <th className="px-3 py-3">Accounts</th>
            <th className="px-3 py-3">Score</th>
            <th className="px-3 py-3">Last login</th>
            <th className="px-3 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.015]">
              <td className="px-3 py-3">
                <button onClick={() => onToggleSelect(u.id)} aria-label={`Select ${u.email}`} className={cn("flex h-4 w-4 items-center justify-center rounded border", selected.has(u.id) ? "border-transparent bg-aurora-teal" : "border-white/20")}>
                  {selected.has(u.id) && <Check size={11} className="text-black" strokeWidth={3} />}
                </button>
              </td>
              <td className="px-3 py-3">
                <Link href={`/admin/users/${u.id}`} className="block hover:text-aurora-teal">
                  <span className="block truncate font-medium text-white/85">{u.displayName}</span>
                  <span className="block truncate text-[11px] text-white/35">{u.email}</span>
                </Link>
              </td>
              <td className="px-3 py-3">
                <span className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase" style={{ background: `${ROLE_COLOR[u.role]}1f`, color: ROLE_COLOR[u.role] }}>{u.role}</span>
              </td>
              <td className="px-3 py-3 text-white/70">{planLimits(u.plan).name}</td>
              <td className="px-3 py-3 font-mono text-white/60">{formatNumber(u.creditsRemaining)}</td>
              <td className="px-3 py-3 text-white/60">{u.connectedAccounts}</td>
              <td className="px-3 py-3 text-white/60">{u.creatorScore ?? "—"}</td>
              <td className="px-3 py-3 text-white/40">{u.lastSignInAt ? timeAgo(u.lastSignInAt) : "Never"}</td>
              <td className="px-3 py-3">
                {u.banned ? (
                  <span className="flex w-fit items-center gap-1 rounded-full bg-red-500/12 px-2 py-0.5 text-[10px] font-medium text-red-400"><Ban size={9} /> Suspended</span>
                ) : (
                  <span className="rounded-full bg-aurora-green/12 px-2 py-0.5 text-[10px] font-medium text-aurora-green">Active</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
