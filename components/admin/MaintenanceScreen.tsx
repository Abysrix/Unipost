import { Wrench } from "lucide-react";
import SignOutButton from "@/components/auth/SignOutButton";

/** Shown to every non-admin when the `maintenance_mode` feature flag is on. */
export default function MaintenanceScreen() {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-aurora-yellow/25 bg-aurora-yellow/[0.08]">
        <Wrench size={26} className="text-aurora-yellow" strokeWidth={1.5} />
      </span>
      <h1 className="font-display text-xl font-bold text-white">UniPost is under maintenance</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-white/45">We&apos;re making some improvements and will be back shortly. Thanks for your patience.</p>
      <div className="mt-6">
        <SignOutButton />
      </div>
    </div>
  );
}
