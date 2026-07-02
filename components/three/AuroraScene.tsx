"use client";

import SceneCanvas from "./SceneCanvas";
import Particles from "./Particles";
import AuroraBackdrop from "./AuroraBackdrop";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";

/**
 * AuroraScene — a ready-to-drop aurora background. Mounts a cursor-reactive
 * particle field over WebGL on capable devices, and cheaply degrades to the CSS
 * AuroraBackdrop on low-end / reduced-motion. Lazy-load this at the call site.
 *
 *   const AuroraScene = dynamic(() => import("@/components/three/AuroraScene"), { ssr: false });
 */
export default function AuroraScene({ count }: { count?: number }) {
  const { tier } = useDeviceCapability();
  const particleCount = count ?? (tier === "high" ? 2400 : 1600);

  return (
    <SceneCanvas fallback={<AuroraBackdrop />}>
      <ambientLight intensity={0.4} />
      <Particles count={particleCount} palette={["#22d3ee", "#34d399"]} />
    </SceneCanvas>
  );
}
