import Link from "next/link";
import type { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";
import AuthForm from "@/components/auth/AuthForm";
import OAuthButtons from "@/components/auth/OAuthButtons";
import { isSafeRedirect } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign in — UniPost" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string; error?: string };
}) {
  const redirectTo = isSafeRedirect(searchParams.redirect)
    ? searchParams.redirect
    : "/dashboard";

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your UniPost workspace" error={searchParams.error}>
      <OAuthButtons />
      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/[0.08]" />
        <span className="text-[10px] uppercase tracking-widest text-white/45">or</span>
        <span className="h-px flex-1 bg-white/[0.08]" />
      </div>
      <AuthForm mode="login" redirectTo={redirectTo} />
      <p className="mt-4 text-center text-xs">
        <Link href="/forgot-password" className="text-white/55 transition-colors hover:text-white/70">
          Forgot your password?
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-white/60">
        New to UniPost?{" "}
        <Link href="/signup" className="text-aurora-teal transition-colors hover:text-aurora-green">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
