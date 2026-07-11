"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  attribute float aScale;
  attribute vec3 aRandom;
  attribute float aSpeed;
  varying float vMix;

  void main() {
    vec3 pos = position;
    float t = uTime * aSpeed;
    pos.x += sin(t + aRandom.x * 6.2831) * 0.25 * aRandom.y;
    pos.y += cos(t * 0.8 + aRandom.y * 6.2831) * 0.25 * aRandom.z;
    pos.z += sin(t * 0.6 + aRandom.z * 6.2831) * 0.15 * aRandom.x;

    vec2 mouseWorld = uMouse * 10.0;
    float dist = distance(pos.xy, mouseWorld);
    float repel = smoothstep(3.0, 0.0, dist);
    pos.xy += normalize(pos.xy - mouseWorld) * repel * 1.2;

    vMix = clamp(length(position.xy) / 12.0, 0.0, 1.0);
    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;
    float camDist = -mvPos.z;
    gl_PointSize = clamp(aScale * (4.0 / camDist) * (1.0 + repel * 2.0), 0.5, 6.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vMix;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.1, d) * 0.55;
    gl_FragColor = vec4(mix(uColorA, uColorB, vMix), alpha);
  }
`;

/**
 * Particles — a reusable, cursor-reactive shader point field.
 * Parameterized by `count` and a two-stop `palette` (defaults to the aurora
 * cyan→green ramp). Additive-blended, depth-write off. Mount inside SceneCanvas.
 */
export default function Particles({
  count = 2000,
  palette = ["#22d3ee", "#34d399"],
}: {
  count?: number;
  palette?: [string, string];
}) {
  const ref = useRef<THREE.Points>(null);
  const { mouse } = useThree();

  const [positions, scales, randoms, speeds] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const randoms = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.5;
      positions[i * 3 + 2] = r * Math.cos(phi) * 0.4;
      scales[i] = 0.3 + Math.random() * 0.7;
      randoms[i * 3] = Math.random();
      randoms[i * 3 + 1] = Math.random();
      randoms[i * 3 + 2] = Math.random();
      speeds[i] = 0.15 + Math.random() * 0.25;
    }
    return [positions, scales, randoms, speeds];
  }, [count]);

  const colorA = palette[0];
  const colorB = palette[1];

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
    }),
    [colorA, colorB]
  );

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uMouse.value.lerp(new THREE.Vector2(mouse.x, mouse.y), 0.05);
    ref.current.rotation.y = clock.elapsedTime * 0.015;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aScale" count={count} array={scales} itemSize={1} />
        <bufferAttribute attach="attributes-aRandom" count={count} array={randoms} itemSize={3} />
        <bufferAttribute attach="attributes-aSpeed" count={count} array={speeds} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
