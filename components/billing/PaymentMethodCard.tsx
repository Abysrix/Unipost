import { ShieldCheck } from "lucide-react";

/**
 * UniPost never stores card details — Razorpay Checkout handles them entirely
 * (PCI-DSS compliant on their end). This card explains that plainly instead of
 * pretending to show a saved card, which would be misleading.
 */
export default function PaymentMethodCard() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05]">
        <ShieldCheck size={17} className="text-aurora-teal" />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-white/85">Secured by Razorpay</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-white/40">Card, UPI and netbanking details are handled entirely by Razorpay at checkout — UniPost never sees or stores them.</p>
      </div>
    </div>
  );
}
