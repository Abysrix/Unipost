import Link from "next/link";
import { Sparkles } from "lucide-react";
import { aiTipOfDay } from "@/lib/mock/dashboard";

/** AI tip of the day — a nudge from the Growth Coach. */
export default function AITipCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-aurora-cyan/20 bg-aurora-cyan/[0.05] p-5">
      <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full" style={{ background: "radial-gradient(circle, rgba(34,211,238,0.15) 0%, transparent 70%)", filter: "blur(30px)" }} />
      <div className="relative flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg [background:linear-gradient(120deg,#22d3ee,#34d399)]"><Sparkles size={13} className="text-black/80" /></span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-aurora-cyan/80">AI Tip of the Day</span>
      </div>
      <p className="relative mt-3 text-[13px] leading-relaxed text-white/75">{aiTipOfDay}</p>
      <Link href="/coach" className="relative mt-4 inline-block text-xs font-medium text-aurora-teal transition-opacity hover:opacity-80">
        Ask the Growth Coach →
      </Link>
    </div>
  );
}
