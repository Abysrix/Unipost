"use client";

import Link from "next/link";
import { Bell, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import WidgetContainer from "@/components/dashboard/WidgetContainer";
import { cn } from "@/lib/utils";
import type { Reminder, ReminderSeverity } from "@/lib/schedule/reminders";

const SEVERITY: Record<ReminderSeverity, { text: string; ring: string; icon: typeof Bell }> = {
  danger: { text: "text-red-400", ring: "border-red-500/20 bg-red-500/[0.04]", icon: XCircle },
  warning: { text: "text-amber-300", ring: "border-amber-400/20 bg-amber-400/[0.04]", icon: AlertTriangle },
  success: { text: "text-aurora-green", ring: "border-aurora-green/20 bg-aurora-green/[0.04]", icon: CheckCircle2 },
  info: { text: "text-aurora-teal", ring: "border-white/[0.07] bg-white/[0.02]", icon: Clock },
};

/** Derived reminder feed (no push). Reusable notification surface. */
export default function RemindersPanel({ reminders }: { reminders: Reminder[] }) {
  return (
    <WidgetContainer title="Reminders" icon={Bell}>
      {reminders.length === 0 ? (
        <p className="py-4 text-center text-sm text-white/35">You&apos;re all caught up.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {reminders.slice(0, 6).map((r) => {
            const s = SEVERITY[r.severity];
            const Icon = s.icon;
            return (
              <li key={r.id}>
                <Link href={r.href} className={cn("flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors hover:brightness-125", s.ring)}>
                  <Icon size={15} className={cn("mt-0.5 shrink-0", s.text)} />
                  <span className="min-w-0">
                    <span className={cn("block text-[12px] font-semibold", s.text)}>{r.title}</span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-white/45">{r.description}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetContainer>
  );
}
