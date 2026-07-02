"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Marquee — seamless infinite horizontal scroll. Duplicates its children once
 * and translates -50%, so the loop is gapless. Pure CSS transform (cheap).
 * Optional hover-pause (state-driven so it overrides the inline animation).
 */
export default function Marquee({
  children,
  speed = 40,
  reverse = false,
  fade = true,
  pauseOnHover = false,
  className,
}: {
  children: React.ReactNode;
  /** Seconds for one full cycle. */
  speed?: number;
  reverse?: boolean;
  fade?: boolean;
  pauseOnHover?: boolean;
  className?: string;
}) {
  const [paused, setPaused] = useState(false);
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {fade && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-bg-primary to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-bg-primary to-transparent" />
        </>
      )}
      <div
        className="flex w-max"
        onMouseEnter={pauseOnHover ? () => setPaused(true) : undefined}
        onMouseLeave={pauseOnHover ? () => setPaused(false) : undefined}
        style={{
          animation: `marqueeLeft ${speed}s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
