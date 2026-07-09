import { cn } from "@/lib/utils";

/** Character count vs the tightest selected-platform limit. */
export default function CharacterCounter({ count, limit }: { count: number; limit: number | null }) {
  const over = limit != null && count > limit;
  const near = limit != null && !over && count > limit * 0.9;
  return (
    <span className={cn("font-mono text-[11px] tabular-nums", over ? "text-red-400" : near ? "text-amber-400" : "text-white/35")}>
      {count.toLocaleString("en-IN")}
      {limit != null && ` / ${limit.toLocaleString("en-IN")}`}
    </span>
  );
}
