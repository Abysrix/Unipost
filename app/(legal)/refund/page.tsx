import type { Metadata } from "next";

export const metadata: Metadata = { title: "Refund Policy · UniPost" };

const EFFECTIVE_DATE = "13 July 2026";

export default function RefundPolicyPage() {
  return (
    <>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">Legal</p>
      <h1 className="mb-2 font-display text-3xl font-bold text-white md:text-4xl">Refund Policy</h1>
      <p className="mb-10 text-sm text-white/40">Effective {EFFECTIVE_DATE} · Private Beta</p>

      <p className="mb-10 leading-relaxed">
        This policy covers paid UniPost subscriptions (Creator Pro, Agency), billed in INR via Razorpay. It
        doesn’t apply to the Free plan, which has no charge.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">7-day money-back guarantee</h2>
      <p className="mb-4 leading-relaxed">
        If you’re on a paid plan for the first time and it’s not right for you, email{" "}
        <a href="mailto:billing@unipost.bharvix.com" className="text-aurora-teal hover:underline">billing@unipost.bharvix.com</a>{" "}
        within 7 days of your first payment for a full refund, no questions asked. This applies once per
        account, to your first paid subscription only.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">Cancelling your subscription</h2>
      <p className="mb-4 leading-relaxed">
        You can cancel anytime from Settings → Billing. Cancelling stops future renewals but doesn’t refund
        the current billing period — you keep paid-plan access until the period you already paid for ends,
        then your account moves to the Free plan.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">Renewals and mid-cycle refunds</h2>
      <p className="mb-4 leading-relaxed">
        Outside the 7-day guarantee above, renewal charges and mid-cycle plan changes are non-refundable —
        this mirrors how most SaaS subscriptions work in India. If a renewal charge was made in error (e.g.,
        you cancelled but were still charged, or a duplicate charge occurred), email us and we’ll investigate
        and refund the error.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">AI credits</h2>
      <p className="mb-4 leading-relaxed">
        AI credits included with your plan reset each billing period and are not refundable once used,
        whether you used them or not (like unused mobile data at the end of a billing cycle).
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">Failed or declined payments</h2>
      <p className="mb-4 leading-relaxed">
        If a renewal payment fails, we’ll notify you by email and give you a grace period to update your
        payment method before any access changes. No refund is applicable to a failed payment, since nothing
        was charged.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">Beta-specific note</h2>
      <p className="mb-4 leading-relaxed">
        If we discontinue or substantially change the private beta in a way that materially affects a paid
        feature you rely on, we’ll pro-rate and refund the unused portion of your current billing period.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">How to request a refund</h2>
      <p className="mb-4 leading-relaxed">
        Email <a href="mailto:billing@unipost.bharvix.com" className="text-aurora-teal hover:underline">billing@unipost.bharvix.com</a>{" "}
        with your account email and the reason. We aim to respond within 2 business days. Approved refunds
        are issued to your original Razorpay payment method within 5–10 business days, depending on your
        bank.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">Contact</h2>
      <p className="mb-4 leading-relaxed">
        <a href="mailto:billing@unipost.bharvix.com" className="text-aurora-teal hover:underline">billing@unipost.bharvix.com</a>
      </p>
    </>
  );
}
