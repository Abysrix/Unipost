import { createAdminClient } from "@/lib/supabase/admin";
import { getCreatorContext } from "@/lib/ai/context";
import { buildCoachContextSummary } from "@/lib/ai/promptBuilder";
import { generateText } from "@/lib/ai/gemini";
import { enqueueJob } from "@/lib/jobs/queue";
import { listAllPosts } from "@/lib/db/posts";
import { listEvents } from "@/lib/db/schedule";
import { listPostAnalytics } from "@/lib/db/analytics";
import { listGoals } from "@/lib/db/growth";
import { computeContentInsights, type ContentInsights, type JoinedPost } from "@/lib/ai/insights";
import { forecastGoals, type GoalForecast } from "@/lib/ai/forecast";
import type { GrowthReport, RecommendationKind, RecommendationSeverity } from "@/types/growth";

/**
 * AI Growth Coach — the genuinely-LLM-powered layer on top of Sprint 6's
 * deterministic rule engine (`lib/growth/recommendations.ts`, untouched
 * this sprint — still runs on every `syncGrowth()` call, still free/instant/
 * always-on). This service adds what a fixed rule threshold can't: a
 * synthesized weekly narrative, a short prioritized daily task list, and a
 * handful of `source: 'ai'` recommendations that reason across the whole
 * context at once instead of one independent if-statement at a time.
 *
 * Runs at most every `STALE_AFTER_DAYS` — a "weekly review" regenerated on
 * every page visit wouldn't be weekly, and every run costs real tokens.
 *
 * Integration Sprint 6: generation moved off the request path entirely.
 * `getGrowthCoachBundle` (the `/coach` page's entrypoint) now only ever
 * reads — if the latest report is stale it enqueues a `growth_report` job
 * (a fast single insert) and returns immediately with whatever it already
 * had; `generateWeeklyReview` (the actual LLM call + persistence) only
 * ever runs inside `lib/jobs/workers/growthReportWorker.ts`, off the
 * background queue. This is the sprint's "frontend becomes thin" principle
 * applied to the one place in this codebase that used to block a page
 * render on an LLM round-trip.
 */

const STALE_AFTER_DAYS = 6;
const AI_RECOMMENDATION_KINDS: RecommendationKind[] = ["content_gap", "audience_strategy", "posting_frequency", "platform_opportunity"];

const REC_COLS = "id,user_id,kind,title,description,action_label,action_href,severity,source,status,created_at,updated_at";

interface CoachOutput {
  summary: string;
  highlights: string[];
  dailyTasks: string[];
  recommendations: { kind: string; title: string; description: string; severity: string }[];
}

async function buildJoinedPosts(): Promise<JoinedPost[]> {
  const [posts, scheduled, postAnalytics] = await Promise.all([listAllPosts(), listEvents(), listPostAnalytics()]);
  const postById = new Map(posts.map((p) => [p.id, p]));
  const eventById = new Map(scheduled.map((s) => [s.id, s]));
  const joined: JoinedPost[] = [];
  for (const m of postAnalytics) {
    const event = eventById.get(m.scheduled_post_id);
    const post = event ? postById.get(event.post_id) : undefined;
    if (event && post) joined.push({ post, event, metrics: m });
  }
  return joined;
}

function summarizeInsights(insights: ContentInsights): string {
  if (insights.sampleSize < 3) return "Not enough real per-post data yet to spot format/length/timing patterns — needs a few more published, synced posts.";
  const bits = [
    insights.bestFormat && `${insights.bestFormat.format} posts average the most engagement (${insights.bestFormat.avgEngagement}, from ${insights.bestFormat.postCount} posts)`,
    insights.bestLength && `${insights.bestLength.bucket}-length posts perform best`,
    insights.bestHour != null && `posting around ${insights.bestHour.hour}:00 correlates with the highest engagement`,
    insights.bestCta && `"${insights.bestCta.style}" is their best-performing call-to-action`,
  ].filter(Boolean);
  return bits.length > 0 ? bits.join("; ") + "." : "No single format/length/timing pattern stands out yet.";
}

function summarizeForecasts(forecasts: GoalForecast[]): string {
  if (forecasts.length === 0) return "No active goals.";
  return forecasts.map((f) => (f.estimatedCompletionDate ? `on track for ${f.estimatedCompletionDate} at the current rate (${f.progressPct}% there)` : `not currently on a pace to hit it (${f.progressPct}% there)`)).join("; ");
}

function isValidKind(k: string): k is RecommendationKind {
  return (AI_RECOMMENDATION_KINDS as string[]).includes(k);
}
function isValidSeverity(s: string): s is RecommendationSeverity {
  return ["info", "success", "warning", "danger"].includes(s);
}

async function generateCoachOutput(contextSummary: string, insightsSummary: string, forecastSummary: string): Promise<CoachOutput | null> {
  try {
    const raw = await generateText({
      system:
        "You are UniPost AI's Growth Coach. You write a short, honest weekly review for a creator using ONLY the real facts given to you — never invent numbers. " +
        "Return ONLY a compact JSON object, no markdown fences, no prose outside the JSON.",
      messages: [{
        role: "user",
        content: `Creator context: ${contextSummary}\n\nContent performance patterns: ${insightsSummary}\n\nGoal pace: ${forecastSummary}\n\n` +
          `Return JSON exactly like: {"summary": "2-3 sentence honest review citing the real numbers above", "highlights": ["short bullet", "short bullet", "short bullet"], "dailyTasks": ["one concrete task for today", "another", "another (max 3)"], "recommendations": [{"kind": "content_gap|audience_strategy|posting_frequency|platform_opportunity", "title": "short title", "description": "1-2 sentences, cite a real number from above where possible", "severity": "info|success|warning"}]} ` +
          `Give 2-4 recommendations, each a different kind, only for things the data above actually supports — fewer good ones beats padding to 4.`,
      }],
      temperature: 0.6,
      maxOutputTokens: 900,
    });
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<CoachOutput>;
    if (!parsed.summary) return null;
    return {
      summary: parsed.summary,
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 5) : [],
      dailyTasks: Array.isArray(parsed.dailyTasks) ? parsed.dailyTasks.slice(0, 3) : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 4) : [],
    };
  } catch {
    // A generation failure or unparseable response here just means the page falls back to the last saved report — not worth surfacing as an error to a page render.
    return null;
  }
}

async function persistAiRecommendations(admin: ReturnType<typeof createAdminClient>, userId: string, output: CoachOutput): Promise<number> {
  const { data: existing } = await admin.from("growth_recommendations").select(REC_COLS).eq("user_id", userId).eq("source", "ai").eq("status", "active");
  const activeByKind = new Map(((existing ?? []) as { kind: RecommendationKind; id: string; title: string; description: string }[]).map((r) => [r.kind, r]));
  const firingKinds = new Set<RecommendationKind>();
  let written = 0;

  for (const rec of output.recommendations) {
    if (!isValidKind(rec.kind) || !rec.title || !rec.description) continue;
    const severity = isValidSeverity(rec.severity) ? rec.severity : "info";
    firingKinds.add(rec.kind);
    const current = activeByKind.get(rec.kind);
    if (!current) {
      const { error } = await admin.from("growth_recommendations").insert({ user_id: userId, kind: rec.kind, title: rec.title, description: rec.description, action_label: "Open Growth Coach", action_href: "/coach", severity, source: "ai", status: "active" });
      if (!error) written++;
    } else if (current.title !== rec.title || current.description !== rec.description) {
      const { error } = await admin.from("growth_recommendations").update({ title: rec.title, description: rec.description, severity }).eq("id", current.id);
      if (!error) written++;
    }
  }

  const resolved = Array.from(activeByKind.entries()).filter(([kind]) => !firingKinds.has(kind));
  await Promise.all(resolved.map(([, r]) => admin.from("growth_recommendations").update({ status: "completed" }).eq("id", (r as { id: string }).id)));

  return written;
}

export interface GrowthCoachBundle {
  report: GrowthReport | null;
  insights: ContentInsights;
  forecasts: GoalForecast[];
}

async function latestReportFor(admin: ReturnType<typeof createAdminClient>, userId: string): Promise<GrowthReport | null> {
  const { data } = await admin.from("growth_reports").select("id,user_id,period_start,period_end,summary,highlights,daily_tasks,generated_at,created_at").eq("user_id", userId).order("period_end", { ascending: false }).limit(1).maybeSingle();
  return (data as GrowthReport | null) ?? null;
}

function isStaleReport(report: GrowthReport | null): boolean {
  return !report || (Date.now() - new Date(report.period_end).getTime()) / 86_400_000 >= STALE_AFTER_DAYS;
}

/**
 * The `/coach` page's entrypoint — read-only, fast, safe to call on every
 * page load. Returns whatever report already exists (possibly stale) plus
 * fresh insights/forecasts (cheap, no LLM, always current even between
 * reviews). If the report is due for a refresh, enqueues a background
 * `growth_report` job (deduped, so repeat page visits before the worker
 * picks it up don't queue it twice) instead of generating inline.
 */
export async function getGrowthCoachBundle(userId: string): Promise<GrowthCoachBundle> {
  const admin = createAdminClient();

  const [joined, goals, latestReport] = await Promise.all([buildJoinedPosts(), listGoals(), latestReportFor(admin, userId)]);
  const insights = computeContentInsights(joined);
  const forecasts = forecastGoals(goals);

  if (isStaleReport(latestReport)) {
    await enqueueJob("growth_report", { userId }, { userId, dedupe: true, maxAttempts: 2 }).catch(() => {});
  }

  return { report: latestReport, insights, forecasts };
}

/**
 * The actual LLM call + persistence — used to live inline in
 * `getGrowthCoachBundle`, now only ever called from
 * `lib/jobs/workers/growthReportWorker.ts` off the background queue.
 * Returns `null` (not an error) when there's nothing worth reviewing yet
 * or the model call/parse failed — the caller (the worker) treats either
 * as "nothing to persist this run," not a job failure to retry, since a
 * retry wouldn't change "this creator has zero posts."
 */
export async function generateWeeklyReview(userId: string): Promise<GrowthReport | null> {
  const admin = createAdminClient();

  const context = await getCreatorContext();
  if (!context || context.activity.totalPosts === 0) return null;

  const [joined, goals] = await Promise.all([buildJoinedPosts(), listGoals()]);
  const insights = computeContentInsights(joined);
  const forecasts = forecastGoals(goals);

  const contextSummary = buildCoachContextSummary(context);
  const output = await generateCoachOutput(contextSummary, summarizeInsights(insights), summarizeForecasts(forecasts));
  if (!output) return null;

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 6 * 86_400_000);
  const row = {
    user_id: userId,
    period_start: periodStart.toISOString().slice(0, 10),
    period_end: periodEnd.toISOString().slice(0, 10),
    summary: output.summary,
    highlights: output.highlights,
    daily_tasks: output.dailyTasks,
    generated_at: new Date().toISOString(),
  };
  const { data: saved, error } = await admin.from("growth_reports").upsert(row, { onConflict: "user_id,period_start" }).select("id,user_id,period_start,period_end,summary,highlights,daily_tasks,generated_at,created_at").single();
  if (error) throw error;

  await persistAiRecommendations(admin, userId, output).catch(() => 0);

  return saved as GrowthReport;
}
