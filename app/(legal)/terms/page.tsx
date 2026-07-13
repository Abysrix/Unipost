import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service · UniPost" };

const EFFECTIVE_DATE = "13 July 2026";

export default function TermsPage() {
  return (
    <>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">Legal</p>
      <h1 className="mb-2 font-display text-3xl font-bold text-white md:text-4xl">Terms of Service</h1>
      <p className="mb-10 text-sm text-white/40">Effective {EFFECTIVE_DATE} · Private Beta</p>

      <p className="mb-10 leading-relaxed">
        These Terms of Service ("Terms") govern your access to and use of UniPost, a product of Bharvix
        ("Bharvix," "we," "us"). By creating an account or using UniPost, you agree to these Terms. If you
        don't agree, don't use UniPost.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">1. Private beta</h2>
      <p className="mb-4 leading-relaxed">
        UniPost is currently in a closed private beta, invite-only, with a limited number of seats. During
        the beta: features may change, be added, or removed without notice; the service may experience
        downtime or bugs; and we may reach out to you directly for feedback. We'll do our best to preserve
        your data across beta changes, but during this phase we don't guarantee 100% uptime or data
        durability the way we will at general availability. Your beta invitation may be non-transferable
        and we may limit the number of active accounts at our discretion.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">2. Your account</h2>
      <p className="mb-4 leading-relaxed">
        You must be at least 18 years old to use UniPost. You're responsible for keeping your login
        credentials secure and for all activity under your account. Tell us immediately at{" "}
        <a href="mailto:security@unipost.bharvix.com" className="text-aurora-teal hover:underline">security@unipost.bharvix.com</a>{" "}
        if you suspect unauthorized access.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">3. Connected platforms</h2>
      <p className="mb-4 leading-relaxed">
        When you connect Instagram, Facebook, LinkedIn, X, YouTube, or Threads, you authorize UniPost to
        publish content and read analytics on your behalf via each platform's official API, within the
        scopes you approve. Your use of each connected platform remains subject to that platform's own
        terms of service — UniPost is not responsible for actions a platform takes against your account
        there (suspension, content removal, API access changes), including where those actions result
        from how UniPost used your authorized access.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">4. Subscription plans and billing</h2>
      <p className="mb-4 leading-relaxed">
        UniPost offers a Free plan and paid Creator Pro / Agency plans billed monthly or yearly in INR via
        Razorpay. Paid plans renew automatically until cancelled. You can cancel anytime from Settings →
        Billing; cancellation takes effect at the end of your current billing period, and you keep paid-plan
        access until then. See our <a href="/refund" className="text-aurora-teal hover:underline">Refund Policy</a> for
        refund terms. AI credits included in your plan reset each billing period and don't roll over.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">5. AI-generated content</h2>
      <p className="mb-4 leading-relaxed">
        UniPost's AI tools generate suggestions — captions, edits, recommendations — based on your inputs
        and context. AI output can be inaccurate, generic, or inappropriate for your specific context. You
        are solely responsible for reviewing and editing AI-generated content before publishing it, and for
        ensuring it complies with each destination platform's policies and applicable law. We don't
        guarantee the accuracy, originality, or fitness of AI-generated content for any purpose.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">6. Your content</h2>
      <p className="mb-4 leading-relaxed">
        You retain all ownership rights to the content you create, upload, and publish through UniPost. You
        grant us a limited license to store, process, and transmit your content solely as needed to
        provide the service (e.g., uploading your media to the platforms you direct us to publish to). You
        represent that you have the rights to any content you upload and that it doesn't infringe anyone
        else's rights.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">7. Prohibited use</h2>
      <p className="mb-4 leading-relaxed">You agree not to use UniPost to:</p>
      <ul className="mb-4 ml-5 list-disc space-y-2 leading-relaxed marker:text-white/25">
        <li>Publish illegal content, or content that infringes intellectual property or violates a connected platform's policies.</li>
        <li>Attempt to circumvent rate limits, credit limits, or plan restrictions.</li>
        <li>Probe, scan, or attack UniPost's infrastructure, or attempt unauthorized access to another user's account or data.</li>
        <li>Resell or provide UniPost's service to third parties without our written consent.</li>
        <li>Use the service in any way that violates applicable Indian or international law.</li>
      </ul>
      <p className="mb-4 leading-relaxed">
        We may suspend or terminate accounts that violate these Terms, with or without notice depending on
        severity.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">8. Intellectual property</h2>
      <p className="mb-4 leading-relaxed">
        UniPost's software, design, branding, and underlying technology are owned by Bharvix. These Terms
        don't grant you any rights to our intellectual property beyond what's needed to use the service as
        intended.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">9. Termination</h2>
      <p className="mb-4 leading-relaxed">
        You may stop using UniPost and delete your account at any time (Settings → Delete Account). We may
        suspend or terminate your access for violating these Terms, non-payment, or (during the beta)
        discontinuing the beta program, with reasonable notice where practical.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">10. Disclaimers and limitation of liability</h2>
      <p className="mb-4 leading-relaxed">
        UniPost is provided "as is" and "as available," especially during the beta. To the fullest extent
        permitted by law, we disclaim all warranties, express or implied, and we are not liable for
        indirect, incidental, or consequential damages arising from your use of the service, including lost
        revenue, lost data, or actions taken by a connected platform. Our total liability for any claim
        related to UniPost is limited to the amount you paid us in the 3 months before the claim arose.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">11. Indemnification</h2>
      <p className="mb-4 leading-relaxed">
        You agree to indemnify Bharvix against claims arising from your content, your use of the service in
        violation of these Terms, or your violation of a connected platform's own terms.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">12. Governing law</h2>
      <p className="mb-4 leading-relaxed">
        These Terms are governed by the laws of India. Disputes will be subject to the exclusive
        jurisdiction of the courts of India.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">13. Changes to these Terms</h2>
      <p className="mb-4 leading-relaxed">
        We'll update the effective date above when these Terms change, and for material changes, notify you
        by email or in-app before they take effect. Continued use after a change means you accept the
        updated Terms.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">14. Contact</h2>
      <p className="mb-4 leading-relaxed">
        Bharvix · <a href="mailto:hello@unipost.bharvix.com" className="text-aurora-teal hover:underline">hello@unipost.bharvix.com</a>
      </p>
    </>
  );
}
