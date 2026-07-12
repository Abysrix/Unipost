import Link from "next/link";
import AuroraBackdrop from "@/components/three/AuroraBackdrop";

/**
 * Auth shell — centered stage over the aurora backdrop, inheriting the UniPost
 * design language. No app chrome. Server component.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 py-16">
      <AuroraBackdrop intensity={0.7} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 80% 70% at 50% 40%, transparent 55%, rgba(5,5,8,0.85) 100%)" }}
      />

      {/* Logo home link */}
      <Link href="/" className="absolute left-6 top-6 z-10 flex items-center gap-2 md:left-10 md:top-8">
        <span className="flex h-5 w-5 items-center justify-center rounded-md [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">
          <span className="h-2 w-2 rounded-sm bg-black/80" />
        </span>
        <span className="font-display text-sm font-bold text-white/90">UniPost</span>
      </Link>

      <div className="relative z-10 w-full flex justify-center">{children}</div>

      <p className="relative z-10 mt-8 text-center text-[11px] text-white/45">
        A Bharvix product · Made in India
      </p>
    </div>
  );
}
