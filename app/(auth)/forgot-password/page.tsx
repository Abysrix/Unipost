import Link from "next/link";
import type { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";
import { ForgotPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Reset your password — UniPost" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Forgot your password?" subtitle="We'll email you a link to reset it">
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-xs text-white/40">
        Remembered it?{" "}
        <Link href="/login" className="text-aurora-teal transition-colors hover:text-aurora-green">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
