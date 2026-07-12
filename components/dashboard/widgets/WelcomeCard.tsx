import Link from "next/link";
import { PenSquare, Flame, CalendarClock } from "lucide-react";
import { summary } from "@/lib/mock/dashboard";
import type { ConnectionWithPermissions } from "@/types/integrations";
import { getPlatform } from "@/config/platforms";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Hero welcome widget — greeting, at-a-glance status, primary action. */
export default function WelcomeCard({
  name,
  connections = [],
}: {
  name: string;
  connections?: ConnectionWithPermissions[];
}) {
  const activeConnections = connections.filter((c) => c.status === "connected");

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full" style={{ background: "radial-gradient(circle, rgba(45,212,191,0.12) 0%, transparent 70%)", filter: "blur(40px)" }} />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-white md:text-2xl" style={{ letterSpacing: "-0.02em" }}>
            {greeting()}, {name} 👋
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/65">
            <span className="flex items-center gap-1.5"><Flame size={14} className="text-orange-400" /> {summary.streak}-day streak</span>
            <span className="flex items-center gap-1.5"><CalendarClock size={14} className="text-aurora-teal" /> {summary.scheduledToday} scheduled today</span>
            
            {activeConnections.length > 0 && (
              <span className="flex items-center gap-1.5 sm:border-l sm:border-white/10 sm:pl-4">
                <span className="text-white/55">Connected:</span>
                <span className="flex items-center gap-1">
                  {activeConnections.map((c) => {
                    const info = getPlatform(c.platform);
                    return (
                      <span
                        key={c.id}
                        title={`${info?.name ?? c.platform}: ${c.display_name}`}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold"
                        style={{ background: `${info?.color || "#fff"}22`, color: info?.color || "#fff" }}
                      >
                        {info?.glyph ?? "?"}
                      </span>
                    );
                  })}
                </span>
              </span>
            )}
          </div>
        </div>
        <Link href="/create" data-cursor="pointer" className="inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-black [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)] transition-shadow hover:shadow-[0_0_36px_rgba(45,212,191,0.32)]">
          <PenSquare size={15} /> Create post
        </Link>
      </div>
    </div>
  );
}
