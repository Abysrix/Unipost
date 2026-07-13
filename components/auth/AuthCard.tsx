import { AlertCircle } from "lucide-react";

const ERRORS: Record<string, string> = {
  oauth: "Google sign-in didn't complete. Please try again.",
  confirm: "This confirmation link has expired or has already been used. If you've already confirmed your email, you can sign in below.",
  auth: "Something went wrong. Please sign in again.",
};

/** Shared glass card shell for the auth pages (server component). */
export default function AuthCard({
  title,
  subtitle,
  error,
  children,
}: {
  title: string;
  subtitle: string;
  error?: string;
  children: React.ReactNode;
}) {
  const errorMsg = error ? ERRORS[error] ?? "Something went wrong." : null;

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-white" style={{ letterSpacing: "-0.02em" }}>
          {title}
        </h1>
        <p className="mt-2 text-sm text-white/60">{subtitle}</p>
      </div>

      {errorMsg && (
        <p role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.08] px-3 py-2 text-xs text-red-300">
          <AlertCircle size={14} className="shrink-0" /> {errorMsg}
        </p>
      )}

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 backdrop-blur-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">
        {children}
      </div>
    </div>
  );
}
