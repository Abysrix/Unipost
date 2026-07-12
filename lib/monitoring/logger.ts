type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

/**
 * Vendor-agnostic logging seam (Sprint 10). Every error boundary and catch
 * block in this app calls through here instead of importing a monitoring
 * SDK directly — swapping providers later (Sentry, Axiom, etc.) means
 * editing the body of `report()` once, not every call site. Safe to import
 * from both client and server code: it never touches a server-only API.
 */
function report(level: LogLevel, message: string, context?: LogContext) {
  const line = context ? [message, context] : [message];
  if (level === "error") console.error(`[${level}]`, ...line);
  else if (level === "warn") console.warn(`[${level}]`, ...line);
  else console.log(`[${level}]`, ...line);

  // Hook point for a real provider once one is configured, e.g.:
  //   if (process.env.SENTRY_DSN) Sentry.captureException(...)
  // Intentionally a no-op until then — logging to stdout/stderr is enough
  // for platform logs (Vercel, etc.) to pick up in the meantime.
}

export const logger = {
  debug: (message: string, context?: LogContext) => report("debug", message, context),
  info: (message: string, context?: LogContext) => report("info", message, context),
  warn: (message: string, context?: LogContext) => report("warn", message, context),
  error: (error: unknown, context?: LogContext) => {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    report("error", message, stack ? { ...context, stack } : context);
  },
};

/**
 * Correlation-ID-scoped logger (Integration Sprint 6, Phase 6) — every call
 * through the returned logger automatically carries `correlationId` in its
 * context, so every console line from one job/cron run/request can be
 * grep'd together in platform logs without threading the id through every
 * call site by hand. Doesn't replace `logger` above (still fine for a
 * one-off, uncorrelated log) — this is for anything that spans multiple log
 * lines over its lifetime, which every job/worker/cron run does.
 */
export function withCorrelation(correlationId: string) {
  const merge = (context?: LogContext): LogContext => ({ correlationId, ...context });
  return {
    debug: (message: string, context?: LogContext) => report("debug", message, merge(context)),
    info: (message: string, context?: LogContext) => report("info", message, merge(context)),
    warn: (message: string, context?: LogContext) => report("warn", message, merge(context)),
    error: (error: unknown, context?: LogContext) => {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      report("error", message, merge(stack ? { ...context, stack } : context));
    },
  };
}
