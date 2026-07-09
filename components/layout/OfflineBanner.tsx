"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/** Fixed top banner shown only while the browser reports no network connection — relevant for a mobile-first, connectivity-variable audience. */
export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-amber-400 px-4 py-2 text-center text-xs font-medium text-black">
      <WifiOff size={14} /> You&apos;re offline — changes won&apos;t save until your connection is back.
    </div>
  );
}
