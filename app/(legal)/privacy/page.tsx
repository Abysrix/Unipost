import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy · UniPost" };

const EFFECTIVE_DATE = "13 July 2026";

export default function PrivacyPolicyPage() {
  return (
    <>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">Legal</p>
      <h1 className="mb-2 font-display text-3xl font-bold text-white md:text-4xl">Privacy Policy</h1>
      <p className="mb-10 text-sm text-white/40">Effective {EFFECTIVE_DATE} · Private Beta</p>

      <p className="mb-4 leading-relaxed">
        UniPost (“UniPost,” “we,” “us,” “our”) is a product of Bharvix. This Privacy Policy explains what
        personal data we collect when you use UniPost (currently in private beta), why we collect it, how
        we use and protect it, and the choices and rights you have. By creating a UniPost account, you
        agree to the collection and use of information as described here.
      </p>
      <p className="mb-10 leading-relaxed">
        If anything here is unclear, or you want to exercise any of your rights, email us at{" "}
        <a href="mailto:privacy@unipost.bharvix.com" className="text-aurora-teal hover:underline">privacy@unipost.bharvix.com</a>.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">1. Information we collect</h2>
      <h3 className="mb-2 mt-6 text-[15px] font-semibold text-white/90">Account information</h3>
      <p className="mb-4 leading-relaxed">
        Name, email address, and password (stored as a salted hash by our authentication provider, Supabase —
        we never see or store your plaintext password) when you sign up. If you sign up with Google, we
        receive your name, email, and profile photo from Google.
      </p>
      <h3 className="mb-2 mt-6 text-[15px] font-semibold text-white/90">Connected social accounts</h3>
      <p className="mb-4 leading-relaxed">
        When you connect Instagram, Facebook, LinkedIn, X, YouTube, or Threads, we receive an OAuth access
        token (encrypted at rest with AES-256-GCM before storage) and basic profile information (name,
        username, avatar) from that platform. We use this token solely to publish content and read analytics
        on your behalf, as authorized by the scopes you approve during connection. We never see or store
        your social account password.
      </p>
      <h3 className="mb-2 mt-6 text-[15px] font-semibold text-white/90">Content you create</h3>
      <p className="mb-4 leading-relaxed">
        Post drafts, captions, uploaded media (images/video), and any content you generate or edit using
        UniPost’s AI tools.
      </p>
      <h3 className="mb-2 mt-6 text-[15px] font-semibold text-white/90">Usage and analytics data</h3>
      <p className="mb-4 leading-relaxed">
        How you use UniPost — pages visited, features used, AI generations run, posts scheduled/published —
        so we can operate, secure, and improve the product during the beta. We also sync engagement metrics
        (reach, likes, comments, follower counts) from your connected platforms’ own analytics APIs so we
        can show you your own performance data.
      </p>
      <h3 className="mb-2 mt-6 text-[15px] font-semibold text-white/90">Payment information</h3>
      <p className="mb-4 leading-relaxed">
        Subscription payments are processed by Razorpay. We do not receive or store your full card number,
        CVV, or UPI PIN — Razorpay handles this directly and shares with us only the payment status,
        amount, and a reference ID.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">2. How we use your information</h2>
      <ul className="mb-4 ml-5 list-disc space-y-2 leading-relaxed marker:text-white/25">
        <li>To provide the core service — scheduling, publishing, and reading analytics for your connected accounts.</li>
        <li>To generate AI content and recommendations personalized to your own posting history and performance (see Section 3).</li>
        <li>To process payments and manage your subscription.</li>
        <li>To send you transactional emails (publish confirmations, billing receipts, security alerts) and, where you’ve opted in, product updates.</li>
        <li>To detect abuse, enforce our Terms of Service, and keep the platform secure.</li>
        <li>To improve UniPost — during the beta specifically, to understand which features work and which don’t.</li>
      </ul>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">3. AI processing</h2>
      <p className="mb-4 leading-relaxed">
        UniPost’s AI features (caption generation, the Smart Editor, the AI Growth Coach) are powered by
        third-party language models accessed via OpenRouter. When you use an AI feature, we send the
        model a purpose-built summary of relevant context — for example, your recent post performance or
        inferred writing style — never your raw analytics data or full post history verbatim. We do not
        use your content to train third-party foundation models, and OpenRouter’s own data-use terms
        govern how it and its upstream model providers handle request data in transit.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">4. Who we share data with</h2>
      <p className="mb-4 leading-relaxed">We share data only where necessary to run the service:</p>
      <ul className="mb-4 ml-5 list-disc space-y-2 leading-relaxed marker:text-white/25">
        <li><strong className="text-white/85">Supabase</strong> — our database, authentication, and file storage provider.</li>
        <li><strong className="text-white/85">Razorpay</strong> — payment processing (India).</li>
        <li><strong className="text-white/85">Resend</strong> — transactional email delivery.</li>
        <li><strong className="text-white/85">OpenRouter</strong> and its upstream model providers — AI content generation.</li>
        <li><strong className="text-white/85">Instagram, Facebook, LinkedIn, X, YouTube, Threads</strong> — only the content and actions you explicitly direct us to publish or read on your behalf via their APIs.</li>
        <li><strong className="text-white/85">Vercel</strong> — application hosting.</li>
      </ul>
      <p className="mb-4 leading-relaxed">
        We do not sell your personal data. We do not share your data with advertisers.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">5. Data retention</h2>
      <p className="mb-4 leading-relaxed">
        We retain your account and content data for as long as your account is active. If you delete your
        account (Settings → Delete Account), we permanently delete your profile, posts, connected-account
        tokens, and personal data within 30 days, except where we’re legally required to retain records
        longer (e.g., payment records for tax/accounting purposes under Indian law).
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">6. Your rights</h2>
      <p className="mb-4 leading-relaxed">
        Under India’s Digital Personal Data Protection Act, 2023, and as a matter of policy for all users
        regardless of location, you have the right to:
      </p>
      <ul className="mb-4 ml-5 list-disc space-y-2 leading-relaxed marker:text-white/25">
        <li>Access the personal data we hold about you (Settings → Export Data).</li>
        <li>Correct inaccurate data (Settings → Profile).</li>
        <li>Delete your account and associated data (Settings → Delete Account).</li>
        <li>Disconnect any social account at any time, immediately revoking our access token for it.</li>
        <li>Withdraw consent for optional processing (e.g., marketing emails) at any time.</li>
        <li>Lodge a grievance with our Grievance Officer — see the Data Processing Notice for contact details.</li>
      </ul>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">7. Cookies</h2>
      <p className="mb-4 leading-relaxed">
        We use a minimal set of cookies, described in full in our{" "}
        <a href="/cookies" className="text-aurora-teal hover:underline">Cookie Policy</a>.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">8. Security</h2>
      <p className="mb-4 leading-relaxed">
        Social account tokens are encrypted at rest (AES-256-GCM). All data in transit is encrypted via
        TLS. Access to your data is enforced at the database level via row-level security, so your data is
        only ever readable by your own authenticated session or by our service infrastructure acting on
        your behalf. No system is perfectly secure, and we can’t guarantee absolute security, but we take
        reasonable, industry-standard measures to protect your data and will notify you if we become aware
        of a breach affecting your account.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">9. Children’s privacy</h2>
      <p className="mb-4 leading-relaxed">
        UniPost is not directed at children under 18. We do not knowingly collect data from anyone under 18.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">10. International data transfers</h2>
      <p className="mb-4 leading-relaxed">
        Our infrastructure providers (Supabase, Vercel, OpenRouter) may process data outside India. Where
        this happens, we rely on their own contractual and technical safeguards for cross-border transfer.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">11. Changes to this policy</h2>
      <p className="mb-4 leading-relaxed">
        We’ll update the effective date above when this policy changes, and for material changes, notify
        you by email or in-app before they take effect.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">12. Contact</h2>
      <p className="mb-4 leading-relaxed">
        Bharvix · <a href="mailto:privacy@unipost.bharvix.com" className="text-aurora-teal hover:underline">privacy@unipost.bharvix.com</a>
      </p>
    </>
  );
}
