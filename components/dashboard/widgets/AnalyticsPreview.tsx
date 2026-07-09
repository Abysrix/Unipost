import { BarChart3 } from "lucide-react";
import WidgetContainer from "../WidgetContainer";
import { analyticsSeries, kpis } from "@/lib/mock/dashboard";

const W = 300, H = 72;
function buildPath(series: number[]) {
  const max = Math.max(...series);
  const pts = series.map((v, i) => [(i / (series.length - 1)) * W, H - (v / max) * (H - 10) - 5] as const);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i]; const [px, py] = pts[i - 1]; const cx = (px + x) / 2;
    d += ` C${cx},${py} ${cx},${y} ${x},${y}`;
  }
  return { line: d, area: `${d} L${W},${H} L0,${H} Z` };
}

/** Analytics snapshot — trend line + headline KPIs, links to full analytics. */
export default function AnalyticsPreview() {
  const { line, area } = buildPath(analyticsSeries);
  return (
    <WidgetContainer title="Analytics" icon={BarChart3} action={{ label: "View all", href: "/analytics" }}>
      <div className="grid grid-cols-3 gap-3">
        {kpis.map((k) => (
          <div key={k.key}>
            <div className="font-display text-lg font-bold text-white">{k.value}</div>
            <div className="text-[11px] text-white/35">{k.label}</div>
            <div className={`text-[11px] ${k.up ? "text-aurora-green" : "text-red-400"}`}>{k.up ? "↑" : "↓"} {k.delta}</div>
          </div>
        ))}
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-4">
        <defs>
          <linearGradient id="dashPrevFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.3" /><stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" /></linearGradient>
          <linearGradient id="dashPrevLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#facc15" /></linearGradient>
        </defs>
        <path d={area} fill="url(#dashPrevFill)" />
        <path d={line} fill="none" stroke="url(#dashPrevLine)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </WidgetContainer>
  );
}
