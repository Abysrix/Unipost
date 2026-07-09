"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/dashboard/StateScreens";
import { logger } from "@/lib/monitoring/logger";

/** App-group error boundary. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error(error, { boundary: "app", digest: error.digest });
  }, [error]);

  return <ErrorState onRetry={reset} />;
}
