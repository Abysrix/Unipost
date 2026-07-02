import { cn } from "@/lib/utils";

/**
 * GradientBorder — a 1px gradient-outlined surface (violet or aurora).
 * Implemented with a padded gradient layer + inner fill (no mask hacks), so it
 * stays crisp and cheap. Use for emphasized cards / the featured pricing tier.
 */
export default function GradientBorder({
  children,
  variant = "aurora",
  radius = "1rem",
  className,
  innerClassName,
}: {
  children: React.ReactNode;
  variant?: "aurora" | "violet";
  radius?: string;
  className?: string;
  innerClassName?: string;
}) {
  const gradient =
    variant === "aurora"
      ? "linear-gradient(120deg, rgba(34,211,238,0.6), rgba(52,211,153,0.5), rgba(250,204,21,0.6))"
      : "linear-gradient(135deg, rgba(167,139,250,0.6), rgba(99,102,241,0.5))";

  return (
    <div
      className={cn("relative p-px", className)}
      style={{ background: gradient, borderRadius: radius }}
    >
      <div
        className={cn("relative h-full w-full bg-bg-primary", innerClassName)}
        style={{ borderRadius: `calc(${radius} - 1px)` }}
      >
        {children}
      </div>
    </div>
  );
}
