import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/db/admin/audit";
import { isSafeRedirect } from "@/lib/utils";

/**
 * OAuth (PKCE) callback — exchanges the `code` for a session, then redirects
 * into the app. On failure, back to /login with an error flag.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const redirectTo = isSafeRedirect(next) ? next : "/dashboard";

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Only a real sign-in, not a password-recovery code exchange, counts as a login event.
      if (redirectTo !== "/reset-password") await logAudit("auth", "login_succeeded", { actorId: data.user?.id, message: "oauth" });
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
