"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema, resetPasswordSchema } from "@/lib/validations/auth";
import { logAudit } from "@/lib/db/admin/audit";

export type AuthState = { error?: string; message?: string } | undefined;

function siteOrigin(): string {
  return headers().get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Email + password sign-in. Used with useFormState. */
export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    await logAudit("security", "login_failed", { message: parsed.data.email });
    return { error: error.message };
  }

  await logAudit("auth", "login_succeeded", { actorId: data.user?.id, message: "password" });
  revalidatePath("/", "layout");
  redirect(formDataRedirect(formData));
}

/** Email + password sign-up (sends a confirmation email). */
export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
      emailRedirectTo: `${siteOrigin()}/auth/confirm`,
    },
  });
  if (error) return { error: error.message };

  return { message: "Almost there — check your inbox to confirm your account." };
}

/** Google OAuth. Bound to a form's action; redirects to the provider. */
export async function signInWithGoogle(): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteOrigin()}/auth/callback` },
  });
  if (error) redirect("/login?error=oauth");
  if (data.url) redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/** Self-service "forgot password" — sends Supabase's built-in recovery email. */
export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.trim()) return { error: "Enter your email address." };

  const supabase = createClient();
  await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${siteOrigin()}/auth/callback?next=/reset-password` });
  // Always the same message — don't reveal whether an account exists for this email.
  return { message: "If an account exists for that email, a reset link is on its way." };
}

/** Sets a new password. Requires the recovery session established by the /auth/callback code exchange. */
export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link expired. Request a new one." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  await logAudit("security", "password_reset_completed", { actorId: user.id });
  redirect("/dashboard");
}

/** Safe post-login redirect target (defaults to /dashboard). */
function formDataRedirect(formData: FormData): string {
  const raw = formData.get("redirect");
  if (typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/dashboard";
}
