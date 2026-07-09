"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/auth/role";
import type { BillingCycle } from "@/types/billing";
import { PLAN_ORDER } from "@/lib/billing/plans";
import PlanCard from "./PlanCard";

export default function PlanComparison({ currentPlan, busyPlan, onSelect }: { currentPlan: Plan; busyPlan: Plan | null; onSelect: (plan: Plan, cycle: BillingCycle) => void }) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <div>
      <div className="mb-5 flex justify-center">
        <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
          {(["monthly", "yearly"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={cn("rounded-md px-4 py-1.5 text-xs font-medium capitalize transition-colors", cycle === c ? "bg-white/[0.08] text-white" : "text-white/45 hover:text-white/70")}
            >
              {c} {c === "yearly" && <span className="ml-1 text-aurora-green">save ~20%</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {PLAN_ORDER.map((p) => (
          <PlanCard key={p} plan={p} cycle={cycle} current={p === currentPlan} busy={busyPlan === p} onSelect={(plan) => onSelect(plan, cycle)} />
        ))}
      </div>
    </div>
  );
}
