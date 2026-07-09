import Link from "next/link";
import { Shield, ArrowLeftRight } from "lucide-react";

/** Slim bar reminding the admin they're in Admin Mode, with a quick way back to the normal app. */
export default function AdminHeader() {
  return (
    <div className="mb-5 flex items-center justify-between rounded-xl border border-aurora-yellow/20 bg-aurora-yellow/[0.04] px-4 py-2.5">
      <span className="flex items-center gap-2 text-[12px] font-medium text-aurora-yellow">
        <Shield size={13} /> Admin Mode — you can see and manage every user&apos;s data
      </span>
      <Link href="/dashboard" className="flex items-center gap-1.5 text-[11px] font-medium text-white/50 transition-colors hover:text-white/80">
        <ArrowLeftRight size={12} /> Back to workspace
      </Link>
    </div>
  );
}
