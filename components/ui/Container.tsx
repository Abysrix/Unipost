import { cn } from "@/lib/utils";

/** Centered max-width wrapper. `narrow` = 1080px reading measure. */
export default function Container({
  children,
  narrow = false,
  className,
}: {
  children: React.ReactNode;
  narrow?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(narrow ? "container-narrow" : "container-custom", className)}>
      {children}
    </div>
  );
}
