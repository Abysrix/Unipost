import type { Role, Plan } from "@/lib/auth/role";
import type { SubscriptionStatus } from "@/types/billing";

/* ── Users ── */
export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  creditsRemaining: number;
  creatorScore: number | null;
  connectedAccounts: number;
  banned: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}

export interface AdminUserDetail extends AdminUserRow {
  emailConfirmed: boolean;
  totalPosts: number;
  scheduledPosts: number;
  xpTotal: number;
}

export interface UserListFilters {
  query?: string;
  role?: Role;
  plan?: Plan;
  status?: "active" | "banned";
  page?: number;
  perPage?: number;
}

export interface UserListResult {
  users: AdminUserRow[];
  total: number;
  page: number;
  perPage: number;
}

/* ── Overview ── */
export interface AdminOverview {
  totalUsers: number;
  activeUsers7d: number;
  newSignups7d: number;
  revenueThisMonth: number; // paise
  mrr: number; // paise
  aiRequestsToday: number;
  scheduledPostsActive: number;
  connectedAccountsActive: number;
  failedJobs24h: number;
}

/* ── AI monitoring ── */
export interface AiUsagePoint {
  date: string;
  generations: number;
  chatMessages: number;
  creditsSpent: number;
}

export interface PopularAction {
  action: string;
  count: number;
}

export interface AiMonitoringSummary {
  requestsToday: number;
  requestsThisMonth: number;
  avgDurationMs: number | null;
  failureRate7d: number; // 0..1, from ai_credit_history absence heuristic — see lib/db/admin/ai.ts
  estimatedCostThisMonth: number; // INR, rough estimate — clearly labeled in UI
  dailySeries: AiUsagePoint[];
  popularActions: PopularAction[];
}

/* ── Platform health ── */
export type HealthStatus = "healthy" | "warning" | "critical" | "unknown";
export interface HealthCheck {
  component: string;
  label: string;
  status: HealthStatus;
  message: string;
  latencyMs?: number;
}

/* ── Feature flags ── */
export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: "general" | "ai" | "beta" | "maintenance";
  enabled: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/* ── Audit ── */
export type AuditCategory = "auth" | "role_change" | "admin_action" | "security" | "api_error";
export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  target_id: string | null;
  category: AuditCategory;
  event_type: string;
  message: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

/** A unified timeline row — composed from audit_logs + billing_events + integration_events + sync_logs. */
export interface TimelineEntry {
  id: string;
  source: "audit" | "billing" | "integration" | "sync";
  category: string;
  title: string;
  message: string | null;
  actorId: string | null;
  createdAt: string;
}

/* ── Content moderation ── */
export interface ModeratedPost {
  id: string;
  user_id: string;
  title: string;
  status: string;
  flagged: boolean;
  moderation_note: string | null;
  platforms: string[];
  created_at: string;
  updated_at: string;
}

/* ── Support tickets ── */
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: "low" | "normal" | "high" | "urgent";
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}
