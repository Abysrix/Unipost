import { Link2, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformId } from "@/config/platforms";

/** Connect/Reconnect entry point — a plain link to the OAuth start route (a real redirect, not a client action). */
export default function OAuthButton({
  platform,
  mode = "connect",
  returnTo = "/integrations",
  className,
}: {
  platform: PlatformId;
  mode?: "connect" | "reconnect";
  returnTo?: string;
  className?: string;
}) {
  return (
    <a
      href={`/auth/oauth/${platform}/start?returnTo=${encodeURIComponent(returnTo)}`}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-black transition-opacity hover:opacity-90 [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]",
        className,
      )}
    >
      {mode === "connect" ? <Link2 size={14} /> : <RotateCw size={14} />}
      {mode === "connect" ? "Connect" : "Reconnect"}
    </a>
  );
}
