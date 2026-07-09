/**
 * Shared SVG chart primitives — pure path/scale math, no rendering. Every chart
 * component in components/charts/* builds on these so the whole chart system
 * shares one coordinate approach and one visual language (aurora gradient).
 */

export interface Point {
  x: number;
  y: number;
}

/** Linear scale: maps a value in [domainMin, domainMax] to [rangeMin, rangeMax]. */
export function scale(value: number, domainMin: number, domainMax: number, rangeMin: number, rangeMax: number): number {
  if (domainMax === domainMin) return rangeMin;
  return rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}

/** Smooth cubic-bezier path through a series of points (same curve style as AnalyticsPreview). */
export function smoothLine(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const { x, y } = points[i];
    const { x: px, y: py } = points[i - 1];
    const cx = (px + x) / 2;
    d += ` C${cx},${py} ${cx},${y} ${x},${y}`;
  }
  return d;
}

/** Close a line path into a filled area down to `baseline` (the chart's bottom edge). */
export function areaFromLine(linePath: string, points: Point[], width: number, baseline: number): string {
  if (points.length === 0) return "";
  return `${linePath} L${width},${baseline} L0,${baseline} Z`;
}

/** Map a series of numbers onto chart coordinates. Pass `domain` to share a scale across series. */
export function seriesToPoints(values: number[], width: number, height: number, padY = 6, domain?: [number, number]): Point[] {
  if (values.length === 0) return [];
  const [min, max] = domain ?? [Math.min(...values, 0), Math.max(...values, 1)];
  return values.map((v, i) => ({
    x: values.length > 1 ? (i / (values.length - 1)) * width : width / 2,
    y: scale(v, min, max, height - padY, padY),
  }));
}

/** SVG arc path for a donut/pie slice, centered at (cx, cy). Angles in radians. */
export function arcPath(cx: number, cy: number, r: number, innerR: number, startAngle: number, endAngle: number): string {
  const p = (angle: number, radius: number): Point => ({ x: cx + radius * Math.sin(angle), y: cy - radius * Math.cos(angle) });
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  const outerStart = p(startAngle, r);
  const outerEnd = p(endAngle, r);
  const innerStart = p(endAngle, innerR);
  const innerEnd = p(startAngle, innerR);
  return [
    `M${outerStart.x},${outerStart.y}`,
    `A${r},${r} 0 ${large} 1 ${outerEnd.x},${outerEnd.y}`,
    `L${innerStart.x},${innerStart.y}`,
    `A${innerR},${innerR} 0 ${large} 0 ${innerEnd.x},${innerEnd.y}`,
    "Z",
  ].join(" ");
}

/** The shared aurora ramp used across every chart (line/bar/pie/heatmap). */
export const CHART_PALETTE = ["#2dd4bf", "#22d3ee", "#34d399", "#facc15", "#f87171", "#a78bfa"];

/** Interpolate a single-hue heat color (0..1 → transparent teal to solid teal). */
export function heatColor(t: number, hex = "#2dd4bf"): string {
  const alpha = 0.08 + Math.max(0, Math.min(1, t)) * 0.82;
  return hexToRgba(hex, alpha);
}

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
