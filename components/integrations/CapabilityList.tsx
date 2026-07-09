import { CAPABILITY_LABELS, type Capability } from "@/config/platforms";

/** Chips of what a platform can publish (Sprint 7 capability system). */
export default function CapabilityList({ capabilities }: { capabilities: Capability[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {capabilities.map((c) => (
        <span key={c} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/60">
          {CAPABILITY_LABELS[c]}
        </span>
      ))}
    </div>
  );
}
