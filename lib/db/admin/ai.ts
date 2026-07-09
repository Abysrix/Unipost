import { createAdminClient } from "@/lib/supabase/admin";
import type { AiMonitoringSummary, AiUsagePoint, PopularAction } from "@/types/admin";

/**
 * Cost is a ROUGH estimate (chars/4 ≈ tokens, blended Gemini-Flash-tier rate)
 * — not real billed token counts, which the Gemini REST wrapper doesn't
 * currently parse out of the response. Clearly labeled as an estimate
 * everywhere it's shown; never presented as an actual bill.
 */
const CHARS_PER_TOKEN = 4;
const EST_INR_PER_1K_TOKENS = 0.015;

export async function getAiMonitoringSummary(days = 14): Promise<AiMonitoringSummary> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const todayStart = new Date(new Date().toISOString().slice(0, 10)).toISOString();
  const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [gensToday, msgsToday, gensMonth, msgsMonth, gensWindow, msgsWindow, failures7d, successes7d] = await Promise.all([
    admin.from("ai_generations").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
    admin.from("ai_messages").select("id", { count: "exact", head: true }).eq("role", "assistant").gte("created_at", todayStart),
    admin.from("ai_generations").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
    admin.from("ai_messages").select("id", { count: "exact", head: true }).eq("role", "assistant").gte("created_at", monthStart),
    admin.from("ai_generations").select("action,output,duration_ms,created_at").gte("created_at", since),
    admin.from("ai_messages").select("content,created_at").eq("role", "assistant").gte("created_at", since),
    admin.from("audit_logs").select("id", { count: "exact", head: true }).eq("category", "api_error").eq("event_type", "gemini_request_failed").gte("created_at", since7d),
    admin.from("ai_credit_history").select("id", { count: "exact", head: true }).in("reason", ["ai_generation", "ai_chat"]).gte("created_at", since7d),
  ]);

  const gens = (gensWindow.data as { action: string; output: string; duration_ms: number | null; created_at: string }[] | null) ?? [];
  const msgs = (msgsWindow.data as { content: string; created_at: string }[] | null) ?? [];

  const durations = gens.map((g) => g.duration_ms).filter((d): d is number => d != null);
  const avgDurationMs = durations.length > 0 ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : null;

  const failCount = failures7d.count ?? 0;
  const successCount = successes7d.count ?? 0;
  const failureRate7d = failCount + successCount > 0 ? failCount / (failCount + successCount) : 0;

  const totalChars = gens.reduce((s, g) => s + g.output.length, 0) + msgs.reduce((s, m) => s + m.content.length, 0);
  const estimatedCostThisMonth = ((gensMonth.count ?? 0) + (msgsMonth.count ?? 0)) > 0
    ? Math.round(((totalChars / CHARS_PER_TOKEN / 1000) * EST_INR_PER_1K_TOKENS) * 100) / 100
    : 0;

  const byDate = new Map<string, AiUsagePoint>();
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    byDate.set(key, { date: key, generations: 0, chatMessages: 0, creditsSpent: 0 });
  }
  for (const g of gens) {
    const p = byDate.get(g.created_at.slice(0, 10));
    if (p) p.generations++;
  }
  for (const m of msgs) {
    const p = byDate.get(m.created_at.slice(0, 10));
    if (p) p.chatMessages++;
  }

  const actionCounts = new Map<string, number>();
  for (const g of gens) actionCounts.set(g.action, (actionCounts.get(g.action) ?? 0) + 1);
  const popularActions: PopularAction[] = Array.from(actionCounts.entries()).map(([action, count]) => ({ action, count })).sort((a, b) => b.count - a.count).slice(0, 8);

  return {
    requestsToday: (gensToday.count ?? 0) + (msgsToday.count ?? 0),
    requestsThisMonth: (gensMonth.count ?? 0) + (msgsMonth.count ?? 0),
    avgDurationMs,
    failureRate7d,
    estimatedCostThisMonth,
    dailySeries: Array.from(byDate.values()),
    popularActions,
  };
}
