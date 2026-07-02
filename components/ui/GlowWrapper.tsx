import { cn } from "@/lib/utils";

/**
 * GlowWrapper — places a soft, blurred radial glow behind its children.
 * Purely decorative (aria-hidden glow); children render above it.
 */
export default function GlowWrapper({
  children,
  color = "rgba(45,212,191,0.18)",
  size = 520,
  className,
  blur = 60,
}: {
  children: React.ReactNode;
  color?: string;
  size?: number;
  className?: string;
  blur?: number;
}) {
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          filter: `blur(${blur}px)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
