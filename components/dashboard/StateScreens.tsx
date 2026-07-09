import Link from "next/link";
import { AlertTriangle, Lock, RotateCw, SearchX } from "lucide-react";

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">{children}</div>;
}

/** Error boundary UI (used by error.tsx — pass `reset` as `onRetry`). */
export function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. Try again, or head back to your dashboard.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <Shell>
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/[0.08]">
        <AlertTriangle size={26} className="text-red-400" strokeWidth={1.5} />
      </span>
      <h2 className="font-display text-xl font-bold text-white">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-white/45">{description}</p>
      <div className="mt-6 flex items-center gap-3">
        {onRetry && (
          <button onClick={onRetry} className="flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold text-black [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">
            <RotateCw size={13} /> Try again
          </button>
        )}
        <Link href="/dashboard" className="rounded-full border border-white/[0.12] px-5 py-2 text-xs font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white">
          Back to dashboard
        </Link>
      </div>
    </Shell>
  );
}

/** 403 — authenticated but not allowed (e.g., non-admin hitting /admin). */
export function Unauthorized() {
  return (
    <Shell>
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.03]">
        <Lock size={26} className="text-white/50" strokeWidth={1.5} />
      </span>
      <h2 className="font-display text-xl font-bold text-white">Access restricted</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-white/45">You don&apos;t have permission to view this page. If you think this is a mistake, contact your workspace admin.</p>
      <Link href="/dashboard" className="mt-6 rounded-full border border-white/[0.12] px-5 py-2 text-xs font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white">
        Back to dashboard
      </Link>
    </Shell>
  );
}

/** 404 — page not found (used by not-found.tsx). */
export function NotFoundState() {
  return (
    <Shell>
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.03]">
        <SearchX size={26} className="text-white/50" strokeWidth={1.5} />
      </span>
      <div className="mb-1 font-display text-4xl font-bold text-gradient-aurora">404</div>
      <h2 className="font-display text-lg font-semibold text-white">Page not found</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-white/45">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link href="/" className="mt-6 rounded-full border border-white/[0.12] px-5 py-2 text-xs font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white">
        Go home
      </Link>
    </Shell>
  );
}
