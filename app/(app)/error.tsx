"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/dashboard/StateScreens";
import { logger } from "@/lib/monitoring/logger";

/** App-group error boundary. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error(error, { boundary: "app", digest: error.digest });
    fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message, stack: error.stack, boundary: "app", digest: error.digest, url: window.location.href }),
    }).catch(() => {});
  }, [error]);

  return <ErrorState onRetry={reset} />;
}
