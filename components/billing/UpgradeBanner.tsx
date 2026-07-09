import Link from "next/link";
import { Sparkles } from "lucide-react";

/** Reusable upsell strip — dropped into any page that wants to nudge an upgrade. */
export default function UpgradeBanner({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-aurora-teal/20 bg-aurora-teal/[0.05] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">
          <Sparkles size={16} className="text-black/80" />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-0.5 text-[13px] text-white/50">{description}</p>
        </div>
      </div>
      <Link href="/billing" className="shrink-0 rounded-full px-5 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">
        Upgrade plan
      </Link>
    </div>
  );
}
