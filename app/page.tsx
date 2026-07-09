"use client";

import { useState, useCallback, useEffect } from "react";
import Loader from "@/components/layout/Loader";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import TrustBar from "@/components/sections/TrustBar";
import Analytics from "@/components/sections/Analytics";
import CreatorOS from "@/components/sections/CreatorOS";
import Platforms from "@/components/sections/Platforms";
import HowItWorks from "@/components/sections/HowItWorks";
import Pricing from "@/components/sections/Pricing";
import WhyUnipost from "@/components/sections/WhyUnipost";
import FinalCTA from "@/components/sections/FinalCTA";

/**
 * UniPost landing page — one continuous story:
 * Hero → Trust → Analytics → Creator OS → Platforms → How It Works →
 * Pricing → Why UniPost → Final CTA → Footer.
 */
export default function Home() {
  const [started, setStarted] = useState(false);
  const onComplete = useCallback(() => setStarted(true), []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const next = params.get("next");
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      if (code) {
        let dest = `/auth/callback?code=${encodeURIComponent(code)}`;
        if (next) dest += `&next=${encodeURIComponent(next)}`;
        window.location.replace(dest);
      } else if (tokenHash && type) {
        let dest = `/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}`;
        if (next) dest += `&next=${encodeURIComponent(next)}`;
        window.location.replace(dest);
      }
    }
  }, []);

  return (
    <>
      {!started && <Loader onComplete={onComplete} />}
      {started && <Navbar />}

      {/* inert while the loader overlays this: without it, Tab can reach Hero's
          real buttons underneath before they're visually revealed. @types/react
          types `inert` as boolean, but React 18's runtime (unlike 19+) doesn't
          special-case it as one — passing the JS boolean `true` literally
          serializes as the string "true" rather than a present/absent HTML
          attribute. The cast keeps the correct runtime output (empty-string
          attribute) while satisfying the (here, simply wrong) prop type. */}
      <main inert={!started ? ("" as unknown as true) : undefined}>
        <Hero start={started} />
        <TrustBar />
        <Analytics />
        <CreatorOS />
        <Platforms />
        <HowItWorks />
        <Pricing />
        <WhyUnipost />
        <FinalCTA />
      </main>

      <Footer />
    </>
  );
}
