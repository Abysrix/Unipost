"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, RotateCcw, Trash2, KeyRound, UserCog, UserSquare2, Mail, Calendar, Zap, Trophy, Link2, FileText, Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/schedule/timezone";
import { formatNumber, timeAgo } from "@/lib/utils";
import { planLimits } from "@/lib/billing/plans";
import type { Role, Plan } from "@/lib/auth/role";
import type { AdminUserDetail } from "@/types/admin";
import {
  suspendUserAction, reactivateUserAction, deleteUserAction, changeUserRoleAction,
  triggerPasswordResetAction, impersonateUserAction, adminSetPlanAction,
} from "@/app/(app)/admin/actions";
import WidgetContainer from "@/components/dashboard/WidgetContainer";
import ConfirmDangerModal from "./ConfirmDangerModal";

function Stat({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3.5">
      <Icon size={13} className="mb-1.5 text-aurora-teal" />
      <div className="font-display text-base font-bold text-white">{value}</div>
      <div className="text-[10px] text-white/35">{label}</div>
    </div>
  );
}

export default function UserDetailPanel({ user }: { user: AdminUserDetail }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function run(fn: () => Promise<{ error?: string }>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await fn();
    setBusy(false);
    if (res.error) setError(res.error);
    else refresh();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06] text-base font-bold text-white">{user.displayName.charAt(0).toUpperCase()}</span>
            <div>
              <h2 className="font-display text-lg font-bold text-white">{user.displayName}</h2>
              <p className="flex items-center gap-1.5 text-[13px] text-white/45"><Mail size={12} /> {user.email} {!user.emailConfirmed && <span className="text-amber-300">(unconfirmed)</span>}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user.banned ? (
              <span className="rounded-full bg-red-500/12 px-2.5 py-1 text-[11px] font-medium text-red-400">Suspended</span>
            ) : (
              <span className="rounded-full bg-aurora-green/12 px-2.5 py-1 text-[11px] font-medium text-aurora-green">Active</span>
            )}
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium uppercase text-white/60">{user.role}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-[12px] text-white/40">
          <span className="flex items-center gap-1.5"><Calendar size={12} /> Joined {formatDateTime(user.createdAt)}</span>
          <span className="flex items-center gap-1.5"><Calendar size={12} /> Last seen {user.lastSignInAt ? timeAgo(user.lastSignInAt) : "never"}</span>
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-500/[0.06] px-3 py-2 text-[12px] text-red-400">{error}</p>}
        {notice && <p className="mt-3 rounded-lg bg-aurora-green/[0.06] px-3 py-2 text-[12px] text-aurora-green">{notice}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
          {user.banned ? (
            <button onClick={() => run(() => reactivateUserAction(user.id))} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3.5 py-2 text-[13px] font-medium text-white/80 transition-colors hover:border-white/25 disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Reactivate
            </button>
          ) : (
            <button onClick={() => run(() => suspendUserAction(user.id))} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3.5 py-2 text-[13px] font-medium text-white/80 transition-colors hover:border-white/25 disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />} Suspend
            </button>
          )}
          <button
            onClick={async () => {
              setBusy(true);
              setError(null);
              const res = await triggerPasswordResetAction(user.email);
              setBusy(false);
              if (res.error) setError(res.error);
              else setNotice("Password reset email sent.");
            }}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3.5 py-2 text-[13px] font-medium text-white/80 transition-colors hover:border-white/25 disabled:opacity-50"
          >
            <KeyRound size={14} /> Send password reset
          </button>
          <button
            onClick={() => run(() => changeUserRoleAction(user.id, (user.role === "admin" ? "creator" : "admin") as Role))}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3.5 py-2 text-[13px] font-medium text-white/80 transition-colors hover:border-white/25 disabled:opacity-50"
          >
            <UserCog size={14} /> {user.role === "admin" ? "Remove admin" : "Make admin"}
          </button>
          <button
            onClick={async () => {
              const res = await impersonateUserAction();
              setError(res.error);
            }}
            disabled={busy}
            title="Future-ready placeholder — not implemented yet"
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3.5 py-2 text-[13px] font-medium text-white/40 transition-colors hover:border-white/20"
          >
            <UserSquare2 size={14} /> Impersonate
          </button>
          <button onClick={() => setShowDelete(true)} disabled={busy} className="ml-auto flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium text-red-300/80 transition-colors hover:bg-red-500/10 hover:text-red-300">
            <Trash2 size={14} /> Delete account
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Zap} label="AI credits" value={formatNumber(user.creditsRemaining)} />
        <Stat icon={Trophy} label="Creator score" value={user.creatorScore != null ? String(user.creatorScore) : "—"} />
        <Stat icon={Link2} label="Connected accounts" value={String(user.connectedAccounts)} />
        <Stat icon={FileText} label="Posts / scheduled" value={`${user.totalPosts} / ${user.scheduledPosts}`} />
      </div>

      <WidgetContainer title="Subscription">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-white/70">Current plan: <span className="font-semibold text-white">{planLimits(user.plan).name}</span> ({user.subscriptionStatus})</span>
          <div className="ml-auto flex items-center gap-2">
            {(["free", "pro", "agency"] as Plan[]).filter((p) => p !== user.plan).map((p) => (
              <button
                key={p}
                onClick={() => run(() => adminSetPlanAction(user.id, p))}
                disabled={busy}
                className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-[12px] font-medium text-white/70 transition-colors hover:border-aurora-teal/40 hover:text-white disabled:opacity-50"
              >
                Set {planLimits(p).name}
              </button>
            ))}
          </div>
        </div>
      </WidgetContainer>

      {showDelete && (
        <ConfirmDangerModal
          title="Delete user account"
          description={`This permanently deletes ${user.email} and everything they own — posts, schedules, connections, billing history. This cannot be undone.`}
          confirmPhrase={user.email}
          confirmLabel="Delete permanently"
          onClose={() => setShowDelete(false)}
          onConfirm={async () => {
            const res = await deleteUserAction(user.id);
            if (res.error) throw new Error(res.error);
            router.push("/admin/users");
          }}
        />
      )}
    </div>
  );
}
