# Setup Guides

Per-platform OAuth app setup, plus an admin console guide. See
[`README.md`](../README.md) first for the general env var table and local setup —
this file goes deeper on the integrations that need a real third-party app
registration, which the README intentionally keeps brief since **none of them
are required to run the product** (every one has a working simulated/stub mode).

Every social-platform OAuth redirect URI follows the same pattern:
`{NEXT_PUBLIC_SITE_URL}/auth/oauth/{platform}/callback` — e.g.
`https://app.unipost.example/auth/oauth/instagram/callback` in production, or
`http://localhost:3000/auth/oauth/instagram/callback` in dev. Register exactly
this URL with each provider below; `lib/integrations/oauth.ts` constructs it the
same way at runtime, so a mismatch here is the most common "OAuth fails at the
last step" cause.

## Instagram & Facebook (Meta for Developers)

Both platforms share one Meta app — create it once at
[developers.facebook.com](https://developers.facebook.com/apps), add the
**Facebook Login** product, and use the same App ID/Secret for both.

| | Instagram | Facebook |
|---|---|---|
| Scopes requested (`lib/integrations/providers.ts`) | `instagram_basic`, `instagram_content_publish`, `pages_show_list` | `public_profile`, `pages_manage_posts`, `pages_read_engagement` |
| Env vars | `INSTAGRAM_CLIENT_ID` / `INSTAGRAM_CLIENT_SECRET` | `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` |
| Redirect URI | `.../auth/oauth/instagram/callback` | `.../auth/oauth/facebook/callback` |

Notes:
- Publishing requires the connected account to be an **Instagram Business or
  Creator account** linked to a Facebook Page — `pages_show_list` is what lets
  UniPost discover that Page on the user's behalf (`lib/schedule/publishers/shared.ts::listManagedPages`).
- `instagram_content_publish` and `pages_manage_posts` are restricted permissions —
  Meta requires **App Review** (with a screencast demonstrating the publish flow)
  before any user outside your app's own team/testers can use them in production.
  Until reviewed, add real testers under **Roles → Test users** to develop against.
- Revoking a connection calls Meta's real revoke endpoint
  (`https://graph.facebook.com/v19.0/me/permissions`) — no extra setup needed
  beyond the app existing.
- To receive real webhook events (`/api/webhooks/meta`), add a Webhooks
  subscription in the app dashboard pointing at that URL, set a verify token you
  choose as `META_WEBHOOK_VERIFY_TOKEN`, and copy the app's **App Secret** into
  `META_APP_SECRET` (used to verify the `X-Hub-Signature-256` header on inbound
  events — see `lib/webhooks/verify.ts`).

## LinkedIn

Create an app at the [LinkedIn Developer Portal](https://developer.linkedin.com/),
associated with a LinkedIn Company Page you administer.

- Scopes requested: `openid`, `profile`, `w_member_social` (Sign In with LinkedIn
  using OpenID Connect + Share on LinkedIn products — request both under the
  app's **Products** tab).
- Env vars: `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`.
- Redirect URI: `.../auth/oauth/linkedin/callback` — add it under **Auth →
  OAuth 2.0 settings → Authorized redirect URLs**.
- `w_member_social` (posting) requires the **Share on LinkedIn** product, which
  LinkedIn grants access to on request — access isn't instant for a new app.
- LinkedIn's token-revoke endpoint shape wasn't verified against a real app during
  development (`lib/integrations/providers.ts`'s LinkedIn config leaves `revokeUrl`
  unset on purpose rather than guessing) — disconnecting still deletes UniPost's
  own copy of the token immediately either way; the token itself stays valid at
  LinkedIn's end until it naturally expires.

## X (Twitter)

Create a project + app at the [X Developer Portal](https://developer.x.com/),
using **OAuth 2.0** (not 1.0a) under **User authentication settings**.

- Scopes requested: `tweet.read`, `tweet.write`, `users.read`, `offline.access`
  (the last one is what makes X issue a refresh token — without it, the
  connection silently stops working once the short-lived access token expires).
- Type of App: **Web App**, with PKCE enabled (`lib/integrations/providers.ts`
  sets `pkce: true` for X — this app always sends a real S256 challenge, never a
  placeholder, via `lib/integrations/crypto.ts`).
- Env vars: `X_CLIENT_ID` / `X_CLIENT_SECRET`.
- Redirect URI: `.../auth/oauth/x/callback` — add under **User authentication
  settings → Callback URI**.
- To receive real webhook events (`/api/webhooks/x`, X's Account Activity API),
  set `X_WEBHOOK_CONSUMER_SECRET` to the app's Consumer Secret — used for the
  CRC signature challenge and inbound signature verification.

## YouTube (Google Cloud Console)

Create a project at [console.cloud.google.com](https://console.cloud.google.com/),
enable the **YouTube Data API v3** and **YouTube Analytics API**, then create an
OAuth 2.0 Client ID (Web application) under **APIs & Services → Credentials**.

- Scopes requested: `youtube.readonly`, `youtube`, `openid`, `profile`.
- Env vars: `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` — or reuse
  `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (the same pair "Continue with
  Google" sign-in uses, if you've already set those up per the main README);
  `lib/integrations/providers.ts::getClientId/getClientSecret` fall back to the
  `GOOGLE_*` pair automatically when the `YOUTUBE_*` ones aren't set.
- Redirect URI: `.../auth/oauth/youtube/callback`.
- `extraAuthParams: { access_type: "offline", prompt: "consent" }` is already set
  in code — this is what makes Google issue a refresh token on every connect
  (without it, a returning user who previously granted consent gets no refresh
  token on reconnect, silently breaking analytics sync a day later).
- Analytics access (`lib/analytics/providers/youtube.ts`) needs the channel to
  have real data to report — a brand-new channel with no views/watch time will
  return mostly zeros, which is correct behavior, not a bug.

## Google Gemini / OpenRouter (AI)

Despite the `Gemini` name in `lib/ai/gemini.ts`, the AI service is
**OpenRouter-backed** (an OpenAI-compatible REST endpoint that can route to
Gemini or other models) — get a key at
[openrouter.ai/keys](https://openrouter.ai/keys) and set it as `API_KEY`
(not `GEMINI_API_KEY` — a stale name from before the OpenRouter switch that
doesn't match any code, only fixed in this file and the README as of RC1).
No further app registration is needed beyond the API key itself.

## Razorpay (Payments)

Create an account at [dashboard.razorpay.com](https://dashboard.razorpay.com/),
then from **Settings → API Keys**, generate a Key ID/Secret (use **Test Mode**
keys during development).

- Env vars: `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
- Webhook: under **Settings → Webhooks**, add an endpoint pointing at
  `{NEXT_PUBLIC_SITE_URL}/api/webhooks/razorpay`, subscribe to at least
  `payment.captured`, `payment.failed`, and `subscription.*` events, and copy
  the generated webhook secret into `RAZORPAY_WEBHOOK_SECRET`. Without this,
  checkout still works (the client-side verify step covers the happy path),
  but async events (a payment that settles after the user closes the tab,
  a subscription renewal) never reach the app.
- Without any Razorpay env vars set at all, checkout runs through an in-app
  mock payment modal that exercises the same server-side verify/activate code
  path — safe to leave unset for local development.

## Admin console guide

Reaching `/admin` requires your user's `app_metadata.role` to be `"admin"` —
set via Supabase Dashboard → **Authentication → Users → (your user) → edit
`raw_app_meta_data`**, e.g. `{"role": "admin"}`. This is deliberately not a
`profiles` column (which a user could otherwise read/reason about) — `app_metadata`
is only ever writable from the Supabase dashboard or a service-role call, never
from the client, and `lib/auth/role.ts` reads it as the sole source of truth for
`isAdmin()`.

Every admin mutation re-checks the role server-side inside the Server Action
itself (`guardAdmin()` in `app/(app)/admin/actions.ts`) — the page-level gate in
`admin/layout.tsx` is defense in depth, not the only check.

What's in the console today:
- **Users** (`/admin/users`) — suspend/reactivate, change role, trigger a
  password-reset email, delete an account (irreversible — the UI requires
  typing the user's email to confirm).
- **Billing** (`/admin/billing`) — manually set a user's plan, cancel/renew a
  subscription, record a refund against a payment.
- **Moderation** (`/admin/moderation`) — flag/unflag/delete individual posts or
  bulk-moderate a selection, with an optional note logged to `audit_logs`.
- **Feature flags** (`/admin/settings`) — toggle flags read at runtime via
  `lib/db/admin/flags.ts::isFlagEnabled()`; `maintenance_mode` is the one with
  the broadest effect (locks out every non-admin from `(app)/*` — see
  `app/(app)/layout.tsx`).
- **Health** (`/admin/health`) — config-presence checks load automatically;
  "Run health check" additionally queries live signals (job queue depth, cron
  recency, webhook signature failures, dead-letter queue size) on demand rather
  than on every page load, to avoid spending API/DB quota on a status dot no one
  is looking at yet.
- **Audit logs** (`/admin/audit`) — every admin action, security-relevant auth
  event (failed logins, password resets), and API error is logged here via
  `lib/db/admin/audit.ts::logAudit()`.

Every write in `lib/db/admin/*` goes through the service-role admin client —
RLS doesn't apply to the admin console by design (see ARCHITECTURE.md's
Security model), so `guardAdmin()`'s app-level check is the only gate. Treat any
new admin action the same way: guard first, admin client for the write, log to
`audit_logs` if it's a meaningful state change.
