import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User, SupabaseClient } from "@supabase/supabase-js";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Refreshes the Supabase auth cookie on every request and returns the current
 * user. Called from the root `middleware.ts`. Keeping this here (vs. inline)
 * follows Supabase's SSR guidance and keeps the middleware readable.
 *
 * Also returns the request-scoped `supabase` client itself (Integration
 * Sprint 1) so the middleware can run one extra `profiles.role` query
 * scoped to just `/admin/*` paths — every other request skips it — and
 * redirect a non-admin at the edge, before any admin page or data renders.
 */
export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null; supabase: SupabaseClient }> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getUser() revalidates the JWT with Supabase (getSession does not).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user, supabase };
}
