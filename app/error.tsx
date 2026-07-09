"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/dashboard/StateScreens";
import { logger } from "@/lib/monitoring/logger";

/** Root error boundary — catches errors on the landing page and (auth) routes (anything outside (app), which has its own). */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error(error, { boundary: "root", digest: error.digest });
  }, [error]);

  return <ErrorState onRetry={reset} />;
}
