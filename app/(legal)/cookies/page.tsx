import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cookie Policy · UniPost" };

const EFFECTIVE_DATE = "13 July 2026";

const COOKIE_TABLE = [
  { name: "sb-access-token / sb-refresh-token", purpose: "Keeps you signed in", type: "Essential", expiry: "Session / 1 year" },
  { name: "unipost_pkce_verifier", purpose: "Secures the social-account connection flow (OAuth PKCE)", type: "Essential", expiry: "10 minutes" },
  { name: "unipost_cookie_consent", purpose: "Remembers your cookie preference so we don't ask again", type: "Essential", expiry: "1 year" },
];

export default function CookiePolicyPage() {
  return (
    <>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">Legal</p>
      <h1 className="mb-2 font-display text-3xl font-bold text-white md:text-4xl">Cookie Policy</h1>
      <p className="mb-10 text-sm text-white/40">Effective {EFFECTIVE_DATE}</p>

      <p className="mb-4 leading-relaxed">
        This Cookie Policy explains what cookies UniPost uses and why. It's part of our{" "}
        <a href="/privacy" className="text-aurora-teal hover:underline">Privacy Policy</a>.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">What are cookies?</h2>
      <p className="mb-4 leading-relaxed">
        Small text files a website stores on your device to remember information between visits.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">Cookies we use</h2>
      <p className="mb-4 leading-relaxed">
        UniPost keeps this deliberately minimal — we don't run third-party advertising or cross-site
        tracking cookies. Every cookie below is <strong className="text-white/85">essential</strong> to
        signing in and using the product; there's currently no optional/analytics cookie to opt out of.
      </p>

      <div className="mb-6 overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] uppercase tracking-wider text-white/40">
              <th className="px-4 py-3 font-medium">Cookie</th>
              <th className="px-4 py-3 font-medium">Purpose</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Expiry</th>
            </tr>
          </thead>
          <tbody>
            {COOKIE_TABLE.map((c) => (
              <tr key={c.name} className="border-b border-white/[0.04] last:border-0">
                <td className="px-4 py-3 font-mono text-[12px] text-white/85">{c.name}</td>
                <td className="px-4 py-3 text-white/60">{c.purpose}</td>
                <td className="px-4 py-3 text-white/60">{c.type}</td>
                <td className="px-4 py-3 text-white/60">{c.expiry}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">Product usage analytics</h2>
      <p className="mb-4 leading-relaxed">
        We separately record product usage events (e.g., which features you use) tied to your logged-in
        account, not via a browser cookie — see our{" "}
        <a href="/privacy" className="text-aurora-teal hover:underline">Privacy Policy</a> for details.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">Managing cookies</h2>
      <p className="mb-4 leading-relaxed">
        Since our cookies are essential to signing in, blocking them in your browser will prevent UniPost
        from working. You can still clear cookies at any time via your browser settings, which will simply
        sign you out.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">Changes</h2>
      <p className="mb-4 leading-relaxed">We'll update the effective date above if this policy changes.</p>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">Contact</h2>
      <p className="mb-4 leading-relaxed">
        <a href="mailto:privacy@unipost.bharvix.com" className="text-aurora-teal hover:underline">privacy@unipost.bharvix.com</a>
      </p>
    </>
  );
}
