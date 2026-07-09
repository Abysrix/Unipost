import { PenSquare, CalendarClock, BarChart3, Bot } from "lucide-react";
import QuickActionCard from "../QuickActionCard";

const actions = [
  { icon: PenSquare, label: "Create Post", description: "Draft with AI in your voice", href: "/create", accent: "#22d3ee" },
  { icon: CalendarClock, label: "Schedule", description: "Queue at peak times", href: "/calendar", accent: "#34d399" },
  { icon: BarChart3, label: "Analytics", description: "See what's working", href: "/analytics", accent: "#a3e635" },
  { icon: Bot, label: "Ask Coach", description: "Your next best move", href: "/coach", accent: "#facc15" },
];

/** Quick-action grid — the four things creators do most. */
export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {actions.map((a) => (
        <QuickActionCard key={a.href} {...a} />
      ))}
    </div>
  );
}
