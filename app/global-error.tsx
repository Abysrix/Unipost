"use client";

import { useEffect } from "react";
import { logger } from "@/lib/monitoring/logger";

/**
 * Last-resort boundary — only fires if the ROOT layout itself throws (a
 * regular error.tsx can't catch that, since the layout wraps it). Replaces
 * <html>/<body> entirely, so it deliberately renders zero app dependencies
 * (no Tailwind classes, no design-system components) — if the root layout
 * broke, anything relying on it could break too. Inline styles only.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error(error, { boundary: "global", digest: error.digest });
    // Plain fetch, no app import — this boundary deliberately stays
    // dependency-free since it only fires when the root layout itself broke.
    fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message, stack: error.stack, boundary: "global", digest: error.digest, url: window.location.href }),
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050508", color: "#fff", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 20 }}>UniPost hit an unexpected error. Try again, or come back in a moment.</p>
          <button
            onClick={reset}
            style={{ background: "linear-gradient(120deg,#22d3ee,#34d399,#facc15)", color: "#000", border: "none", borderRadius: 999, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
