import type { Metadata } from "next";

export const metadata: Metadata = { title: "Data Processing Notice · UniPost" };

const EFFECTIVE_DATE = "13 July 2026";

const SUB_PROCESSORS = [
  { name: "Supabase", purpose: "Database, authentication, file storage" },
  { name: "Vercel", purpose: "Application hosting" },
  { name: "Razorpay", purpose: "Payment processing" },
  { name: "Resend", purpose: "Transactional email delivery" },
  { name: "OpenRouter", purpose: "AI content generation (routes to underlying model providers)" },
  { name: "Meta (Instagram, Facebook, Threads), LinkedIn, X, Google (YouTube)", purpose: "Publishing and analytics on accounts you connect" },
];

export default function DataProcessingPage() {
  return (
    <>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">Legal</p>
      <h1 className="mb-2 font-display text-3xl font-bold text-white md:text-4xl">Data Processing Notice</h1>
      <p className="mb-10 text-sm text-white/40">Effective {EFFECTIVE_DATE}</p>

      <p className="mb-10 leading-relaxed">
        This notice supplements our <a href="/privacy" className="text-aurora-teal hover:underline">Privacy Policy</a> with
        the technical detail expected of a "data fiduciary" under India's Digital Personal Data Protection
        Act, 2023 ("DPDP Act") — who processes your data, why, and who you can contact about it.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">Data fiduciary</h2>
      <p className="mb-4 leading-relaxed">
        Bharvix operates UniPost and is the data fiduciary for personal data processed through it.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">Categories of data processed</h2>
      <ul className="mb-4 ml-5 list-disc space-y-2 leading-relaxed marker:text-white/25">
        <li>Identity data — name, email, avatar.</li>
        <li>Account credentials — password hash, OAuth tokens for connected platforms (encrypted at rest).</li>
        <li>Content data — posts, captions, media, AI conversation history.</li>
        <li>Usage data — feature usage, AI generations, publishing activity, in-app events.</li>
        <li>Analytics data — engagement metrics synced from your connected platforms' own APIs.</li>
        <li>Billing data — subscription status, payment history (not full card/UPI details, which Razorpay holds directly).</li>
      </ul>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">Purpose and legal basis</h2>
      <p className="mb-4 leading-relaxed">
        We process this data on the basis of your consent (given at signup and when connecting each
        platform) and as necessary to perform our contract with you (the UniPost Terms of Service) —
        specifically, to operate the scheduling, publishing, analytics, AI, and billing features you sign
        up to use.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">Sub-processors</h2>
      <p className="mb-4 leading-relaxed">We use the following sub-processors to operate UniPost:</p>
      <div className="mb-6 overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full min-w-[480px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] uppercase tracking-wider text-white/40">
              <th className="px-4 py-3 font-medium">Sub-processor</th>
              <th className="px-4 py-3 font-medium">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {SUB_PROCESSORS.map((s) => (
              <tr key={s.name} className="border-b border-white/[0.04] last:border-0">
                <td className="px-4 py-3 text-white/85">{s.name}</td>
                <td className="px-4 py-3 text-white/60">{s.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">Retention</h2>
      <p className="mb-4 leading-relaxed">
        Retained for as long as your account is active, and deleted within 30 days of account deletion,
        except billing records we're legally required to retain longer under Indian tax law.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">Cross-border transfer</h2>
      <p className="mb-4 leading-relaxed">
        Some sub-processors above may process data outside India. We rely on each provider's own
        contractual and technical safeguards for cross-border transfer, consistent with the DPDP Act.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">Security measures</h2>
      <ul className="mb-4 ml-5 list-disc space-y-2 leading-relaxed marker:text-white/25">
        <li>Encryption in transit (TLS) for all traffic.</li>
        <li>Encryption at rest (AES-256-GCM) for connected-platform access tokens.</li>
        <li>Row-level security enforced at the database layer, scoping every query to its own user.</li>
        <li>Rate limiting on authentication and AI endpoints to reduce abuse.</li>
        <li>Signed, verified webhooks for all inbound payment and platform events.</li>
      </ul>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">Your rights</h2>
      <p className="mb-4 leading-relaxed">
        See Section 6 of our <a href="/privacy" className="text-aurora-teal hover:underline">Privacy Policy</a> for
        the full list of rights available to you, and how to exercise them from within Settings.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">Grievance Officer</h2>
      <p className="mb-4 leading-relaxed">
        As required under the DPDP Act, you can raise a grievance about how we handle your personal data
        with our Grievance Officer:
      </p>
      <p className="mb-4 leading-relaxed">
        Grievance Officer, Bharvix ·{" "}
        <a href="mailto:grievance@unipost.bharvix.com" className="text-aurora-teal hover:underline">grievance@unipost.bharvix.com</a>
      </p>
      <p className="mb-4 leading-relaxed">We aim to acknowledge grievances within 48 hours and resolve them within 30 days.</p>
    </>
  );
}
