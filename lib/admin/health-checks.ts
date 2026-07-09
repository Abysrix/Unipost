import type { HealthCheck } from "@/types/admin";

/**
 * Platform Health — pure classification logic (Phase 5). Each check is a
 * config-presence probe, not a live network ping: pinging Gemini/Razorpay on
 * every admin dashboard load would spend real API quota just to render a
 * status dot. "Run health check" is a manual, opt-in action instead.
 */

function envConfigured(...keys: string[]): boolean {
  return keys.every((k) => Boolean(process.env[k]));
}

export function computeHealthChecks(): HealthCheck[] {
  return [
    {
      component: "database",
      label: "Database",
      status: envConfigured("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY") ? "healthy" : "critical",
      message: envConfigured("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY") ? "Supabase configured and reachable (this page loaded)." : "Supabase env vars missing.",
    },
    {
      component: "auth",
      label: "Authentication",
      status: envConfigured("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY") ? "healthy" : "critical",
      message: "Supabase Auth — same project as the database.",
    },
    {
      component: "storage",
      label: "Storage",
      status: envConfigured("SUPABASE_SERVICE_ROLE_KEY") ? "healthy" : "warning",
      message: envConfigured("SUPABASE_SERVICE_ROLE_KEY") ? "Service-role key present for admin/storage operations." : "SUPABASE_SERVICE_ROLE_KEY not set — admin operations will fail.",
    },
    {
      component: "gemini",
      label: "Gemini API",
      status: envConfigured("GEMINI_API_KEY") ? "healthy" : "warning",
      message: envConfigured("GEMINI_API_KEY") ? "AI Studio, chat and Growth Coach are live." : "GEMINI_API_KEY not set — AI features return a friendly error.",
    },
    {
      component: "razorpay",
      label: "Razorpay",
      status: envConfigured("RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET") ? "healthy" : "warning",
      message: envConfigured("RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET") ? "Real checkout is live." : "Not configured — checkout runs through the in-app mock modal.",
    },
    {
      component: "razorpay_webhook",
      label: "Razorpay webhook",
      status: envConfigured("RAZORPAY_WEBHOOK_SECRET") ? "healthy" : "unknown",
      message: envConfigured("RAZORPAY_WEBHOOK_SECRET") ? "Webhook signature verification configured." : "No webhook secret — /api/webhooks/razorpay will reject all events until one is set.",
    },
    {
      component: "integrations",
      label: "Social Integrations",
      status: envConfigured("INTEGRATIONS_SECRET_KEY") ? "healthy" : "critical",
      message: envConfigured("INTEGRATIONS_SECRET_KEY") ? "Token encryption + OAuth state signing configured." : "INTEGRATIONS_SECRET_KEY not set — /integrations connect flow will fail closed.",
    },
    {
      component: "scheduler_worker",
      label: "Scheduler / queue worker",
      status: "unknown",
      message: "No background worker exists yet — 'Publish now' is manual. A cron/edge-function worker is a known follow-up (Sprint 5).",
    },
    {
      component: "oauth_providers",
      label: "OAuth providers (per-platform)",
      status: "unknown",
      message: "No real platform developer-app credentials configured — connections run through the simulated consent screen (Sprint 7).",
    },
  ];
}

export function overallStatus(checks: HealthCheck[]): "healthy" | "warning" | "critical" {
  if (checks.some((c) => c.status === "critical")) return "critical";
  if (checks.some((c) => c.status === "warning" || c.status === "unknown")) return "warning";
  return "healthy";
}

/**
 * Settings' "Environment Configuration" panel (Phase 8) needs a plain presence
 * list, not the healthy/warning/critical framing computeHealthChecks() uses for
 * live monitoring — same env vars, lighter read. Never returns the value itself.
 */
export function envPresenceTable(): { key: string; label: string; present: boolean }[] {
  return [
    { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase URL", present: envConfigured("NEXT_PUBLIC_SUPABASE_URL") },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Supabase anon key", present: envConfigured("NEXT_PUBLIC_SUPABASE_ANON_KEY") },
    { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase service-role key", present: envConfigured("SUPABASE_SERVICE_ROLE_KEY") },
    { key: "GEMINI_API_KEY", label: "Gemini API key", present: envConfigured("GEMINI_API_KEY") },
    { key: "RAZORPAY_KEY_ID", label: "Razorpay key ID", present: envConfigured("RAZORPAY_KEY_ID") },
    { key: "RAZORPAY_KEY_SECRET", label: "Razorpay key secret", present: envConfigured("RAZORPAY_KEY_SECRET") },
    { key: "RAZORPAY_WEBHOOK_SECRET", label: "Razorpay webhook secret", present: envConfigured("RAZORPAY_WEBHOOK_SECRET") },
    { key: "INTEGRATIONS_SECRET_KEY", label: "Integrations secret key", present: envConfigured("INTEGRATIONS_SECRET_KEY") },
  ];
}
