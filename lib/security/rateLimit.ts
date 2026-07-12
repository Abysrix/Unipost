import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/monitoring/logger";

/**
 * Checks rate limits via the public.check_rate_limit Postgres function using the admin client.
 * 
 * @param actionName Unique identifier for the action (e.g. 'login', 'signup', 'ai_chat')
 * @param maxRequests Maximum allowed requests in the window
 * @param windowSeconds Window length in seconds
 * @returns Promise<boolean> true if request is within limits, false if rate limited
 */
export async function checkRateLimit(
  actionName: string,
  maxRequests: number,
  windowSeconds: number
): Promise<boolean> {
  const reqHeaders = headers();
  const ip = reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const bucketKey = `${actionName}:${ip}`;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: bucketKey,
      p_max: maxRequests,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      logger.error("Rate limit check database error", { error: error.message, bucketKey });
      return true; // Fail open to avoid blocking legitimate users if DB has issues
    }

    return Boolean(data);
  } catch (err: any) {
    logger.error("Rate limit check unexpected exception", { error: err?.message || err, bucketKey });
    return true; // Fail open
  }
}
