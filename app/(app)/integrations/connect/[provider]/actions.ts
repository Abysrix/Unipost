"use server";

import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { requireUser } from "@/lib/auth/getUser";
import { platforms, type PlatformId } from "@/config/platforms";
import { isSafeRedirect } from "@/lib/utils";

function isPlatformId(v: string): v is PlatformId {
  return platforms.some((p) => p.id === v);
}

/**
 * The mock consent screen's "Allow" action. Generates a disposable code and
 * redirects to the SAME callback route a real provider would use — the
 * callback route can't tell the difference, which is exactly the point.
 */
export async function mockAuthorize(platform: string, state: string): Promise<void> {
  await requireUser();
  if (!isPlatformId(platform)) redirect("/integrations?error=unknown_platform");
  const code = `mock_${randomBytes(12).toString("hex")}`;
  redirect(`/auth/oauth/${platform}/callback?code=${code}&state=${encodeURIComponent(state)}`);
}

export async function mockDeny(returnTo: string): Promise<void> {
  await requireUser();
  redirect(isSafeRedirect(returnTo) ? returnTo : "/integrations");
}
