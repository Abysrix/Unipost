import { createAdminClient } from "@/lib/supabase/admin";
import { hashPayload } from "./verify";

/**
 * Every inbound webhook logs here first — before any business-logic
 * processing — via a unique `(provider, payload_hash)` index. A provider
 * retry of the *identical* payload hits the unique-violation and is
 * reported as a duplicate instead of reprocessed; this is the real
 * idempotency mechanism (Phase 4/10), not a TODO.
 */

export interface WebhookLogResult {
  isDuplicate: boolean;
  eventId: string | null;
}

export async function logWebhookEvent(provider: string, rawBody: string, eventType: string | null, signatureValid: boolean, payload: unknown): Promise<WebhookLogResult> {
  const admin = createAdminClient();
  const payloadHash = hashPayload(rawBody);

  const { data, error } = await admin
    .from("webhook_events")
    .insert({ provider, event_type: eventType, payload_hash: payloadHash, payload: payload ?? {}, signature_valid: signatureValid, status: "received" })
    .select("id")
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") return { isDuplicate: true, eventId: null }; // unique_violation — genuine duplicate delivery
    throw error;
  }
  return { isDuplicate: false, eventId: (data as { id: string }).id };
}

export async function markWebhookProcessed(eventId: string, status: "processed" | "failed" | "ignored", error?: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("webhook_events").update({ status, error: error ?? null, processed_at: new Date().toISOString() }).eq("id", eventId);
}
