import { cn } from "@/lib/utils";

type GradientVariant = "aurora" | "violet" | "stroke-white" | "stroke-aurora";

const variantClass: Record<GradientVariant, string> = {
  aurora: "text-gradient-aurora",
  violet: "text-gradient-violet",
  "stroke-white": "text-stroke-white",
  "stroke-aurora": "text-stroke-aurora",
};

/**
 * Inline emphasis text — gradient-clipped or outline-stroked.
 * Use sparingly inside headings (gradient = importance).
 */
export default function GradientText({
  children,
  variant = "aurora",
  className,
}: {
  children: React.ReactNode;
  variant?: GradientVariant;
  className?: string;
}) {
  return <span className={cn("inline-block", variantClass[variant], className)}>{children}</span>;
}
