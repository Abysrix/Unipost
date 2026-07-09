import type { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Set a new password — UniPost" };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Set a new password" subtitle="Choose something you haven't used before">
      <ResetPasswordForm />
    </AuthCard>
  );
}
