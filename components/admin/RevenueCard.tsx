import { IndianRupee, TrendingUp } from "lucide-react";
import { formatINR } from "@/lib/billing/plans";
import BarChart from "@/components/charts/BarChart";

export default function RevenueCard({ revenueThisMonth, mrr, byMonth }: { revenueThisMonth: number; mrr: number; byMonth: { month: string; amount: number }[] }) {
  const data = byMonth.map((m) => ({ label: new Date(`${m.month}-01`).toLocaleDateString("en-IN", { month: "short" }), value: m.amount / 100 }));

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-[12px] text-white/40"><IndianRupee size={12} /> Revenue this month</p>
          <p className="font-display text-2xl font-bold text-white">{formatINR(revenueThisMonth)}</p>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-1.5 text-[12px] text-white/40"><TrendingUp size={12} /> MRR</p>
          <p className="font-display text-lg font-bold text-aurora-teal">{formatINR(mrr)}</p>
        </div>
      </div>
      <BarChart data={data} height={100} formatValue={(n) => `₹${n.toLocaleString("en-IN")}`} />
    </div>
  );
}
