import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Current authenticated user, or null. Verifies the JWT with Supabase.
 * Wrapped in React `cache` so multiple calls within a single request (e.g. the
 * app layout + the page) share one round-trip.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Require a session — redirects to /login if absent. Use in protected layouts/pages. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
