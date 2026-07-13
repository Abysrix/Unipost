import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "./logger";

/**
 * Real DB-persisted error/crash log (LaunchOps Phase 2) — deliberately a
 * separate module from logger.ts, not an extension of its shared `report()`.
 * logger.ts is imported by app/error.tsx and friends, which Next.js requires
 * to be Client Components — a service-role DB write in that shared path
 * would pull a server-only module into the client bundle. This module is
 * only ever imported from server-side code (API routes, Server Actions,
 * workers) that already catch a specific, classifiable failure — same
 * "never import into client code" discipline as lib/supabase/admin.ts
 * itself, which this depends on directly.
 */

export type ErrorSource =
  | "unhandled_exception" | "api_failure" | "worker_failure"
  | "oauth_failure" | "publishing_failure" | "analytics_failure"
  | "client_error" | "other";

export type ErrorSeverity = "debug" | "info" | "warning" | "error" | "critical";

export interface PersistErrorInput {
  source: ErrorSource;
  error: unknown;
  userId?: string | null;
  context?: Record<string, unknown>;
  severity?: ErrorSeverity;
}

/** Logs to the console via the existing seam AND persists a row for the admin error-monitoring view. Never throws — a failure to record an error must not itself become an unhandled exception. */
export async function persistError(input: PersistErrorInput): Promise<void> {
  const message = input.error instanceof Error ? input.error.message : String(input.error);
  const stack = input.error instanceof Error ? input.error.stack : undefined;
  logger.error(input.error, { source: input.source, ...input.context });

  try {
    const admin = createAdminClient();
    await admin.from("error_logs").insert({
      user_id: input.userId ?? null,
      source: input.source,
      message: message.slice(0, 2000),
      stack: stack?.slice(0, 8000) ?? null,
      context: input.context ?? {},
      severity: input.severity ?? "error",
    });
  } catch {
    /* best-effort — the console log above already captured it */
  }
}
