"use client";

import { Canvas } from "@react-three/fiber";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";

type CameraProp = React.ComponentProps<typeof Canvas>["camera"];

/**
 * SceneCanvas — the reusable R3F canvas wrapper. One place for our render
 * defaults (alpha, no MSAA, high-performance, capped dpr) + a device-aware
 * fallback: under reduced motion / low-end devices it renders `fallback`
 * (usually <AuroraBackdrop/>) instead of mounting WebGL.
 *
 * Lazy-load at the call site: `dynamic(() => import(".../MyScene"), { ssr:false })`.
 */
export default function SceneCanvas({
  children,
  fallback = null,
  camera = { position: [0, 0, 10], fov: 55, near: 0.1, far: 100 } as CameraProp,
  className,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  camera?: CameraProp;
  className?: string;
}) {
  const { enableWebGL, dpr, ready } = useDeviceCapability();

  // Until we know the device (or if WebGL is a bad idea), show the cheap fallback.
  if (!ready || !enableWebGL) return <>{fallback}</>;

  return (
    <Canvas
      className={className}
      camera={camera}
      dpr={dpr}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      {children}
    </Canvas>
  );
}
