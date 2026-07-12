import Link from "next/link";
import type { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";
import AuthForm from "@/components/auth/AuthForm";
import OAuthButtons from "@/components/auth/OAuthButtons";

export const metadata: Metadata = { title: "Create your account — UniPost" };

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <AuthCard title="Start creating" subtitle="Your Creator OS, free to begin" error={searchParams.error}>
      <OAuthButtons />
      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/[0.08]" />
        <span className="text-[10px] uppercase tracking-widest text-white/45">or</span>
        <span className="h-px flex-1 bg-white/[0.08]" />
      </div>
      <AuthForm mode="signup" />
      <p className="mt-6 text-center text-xs text-white/60">
        Already have an account?{" "}
        <Link href="/login" className="text-aurora-teal transition-colors hover:text-aurora-green">
          Sign in
        </Link>
      </p>
      <p className="mt-4 text-center text-[10px] leading-relaxed text-white/45">
        By continuing you agree to UniPost&apos;s Terms and Privacy Policy.
      </p>
    </AuthCard>
  );
}
