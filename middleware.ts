import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Public page routes — everything else under the app is protected by default.
 * An allow-list (rather than the old ["/dashboard","/app"] deny-list) means a
 * new page added under (app)/* is protected automatically, with no chance of
 * forgetting to register it here. "/app" never matched anything real: route
 * groups like (app) are stripped from the URL, so that entry was dead.
 * `/api/*` is deliberately out of scope — routes there self-authenticate
 * (session check inside the handler, or a signature check for webhooks).
 */
const PUBLIC_PATHS = new Set(["/", "/login", "/signup", "/forgot-password", "/reset-password"]);
/** Auth routes an authenticated user should be redirected away from. */
const AUTH_ROUTES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isApiRoute = pathname.startsWith("/api/");
  const isAuthCallback = pathname.startsWith("/auth/");
  const isPublic = PUBLIC_PATHS.has(pathname) || isAuthCallback;
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!isApiRoute && !isPublic && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on everything except static assets & files (so the session stays fresh).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico)$).*)",
  ],
};
