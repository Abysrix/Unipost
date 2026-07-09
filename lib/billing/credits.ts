import type { AIActionId } from "@/lib/ai/prompts";
import type { Plan } from "@/lib/auth/role";
import { planLimits } from "./plans";

/**
 * Credit cost config — "1 credit ≈ 1 AI action" (matches config/pricing.ts's
 * existing explainer copy). Every AI entry point spends through `CREDIT_COSTS`,
 * never a hardcoded number at the call site.
 */
export const CREDIT_COSTS: Record<AIActionId, number> = {
  caption: 1, hook: 1, hashtags: 1, cta: 1, emoji: 1,
  expand: 1, shorten: 1, grammar: 1, rewrite: 1,
  summarize: 1, translate: 1, optimize: 1, improve: 1,
};

/** Flat cost for one chat turn (a full assistant reply). */
export const CHAT_MESSAGE_COST = 1;

export function costForAction(action: AIActionId): number {
  return CREDIT_COSTS[action] ?? 1;
}

/** The monthly credit allotment a plan grants on reset/upgrade. */
export function monthlyAllotment(plan: Plan): number {
  return planLimits(plan).aiCreditsPerMonth;
}

/** This calendar month's marker (first-of-month, UTC) — the reset/usage-period key. */
export function currentPeriod(d = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}
