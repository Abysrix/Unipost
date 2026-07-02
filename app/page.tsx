"use client";

import { useState, useCallback } from "react";
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

  return (
    <>
      {!started && <Loader onComplete={onComplete} />}
      {started && <Navbar />}

      <main>
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
