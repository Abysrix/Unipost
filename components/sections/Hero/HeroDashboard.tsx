"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import DashboardPanel from "./dashboard/DashboardPanel";
import AICoachCard from "./dashboard/AICoachCard";
import CreatorXPCard from "./dashboard/CreatorXPCard";
import NotificationToast from "./dashboard/NotificationToast";

/**
 * HeroDashboard — the living product surface.
 *  · GSAP (in Hero) animates the [data-anim="dashboard"] + [data-anim="float"]
 *    wrappers for the entrance.
 *  · A subtle mouse tilt rotates the whole group (inner wrapper).
 *  · CSS float loops move the panel + each floating card independently.
 *  · `live` (set shortly after the entrance begins) triggers the widget content
 *    animations — charts draw, counters run, the coach types, toasts cycle.
 */
export default function HeroDashboard({ start }: { start: boolean }) {
  const reduced = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!start) return;
    const t = setTimeout(() => setLive(true), reduced ? 0 : 1500);
    return () => clearTimeout(t);
  }, [start, reduced]);

  const onMove = (e: React.MouseEvent) => {
    if (reduced || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -5, y: px * 6 });
  };
  const onLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <div data-anim="dashboard" className="relative" style={{ perspective: "1600px" }}>
      <div
        ref={containerRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: "preserve-3d",
          transition: "transform 0.5s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Main panel — floats slowly */}
        <div className="animate-float-slow" style={{ transformStyle: "preserve-3d" }}>
          <DashboardPanel live={live} />
        </div>

        {/* Floating cards — desktop only; each drifts independently */}
        <div data-anim="float" className="absolute -left-14 top-12 z-20 hidden lg:block">
          <div className="animate-float">
            <AICoachCard live={live} />
          </div>
        </div>

        <div data-anim="float" className="absolute -left-8 bottom-14 z-20 hidden lg:block">
          <div className="animate-float-slow">
            <CreatorXPCard live={live} />
          </div>
        </div>

        <div data-anim="float" className="absolute -right-8 -top-2 z-20 hidden lg:block">
          <div className="animate-float">
            <NotificationToast live={live} />
          </div>
        </div>
      </div>
    </div>
  );
}
