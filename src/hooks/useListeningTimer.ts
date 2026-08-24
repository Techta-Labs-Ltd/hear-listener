import type { ListeningTimerResult } from "@/types";
import { useEffect, useState } from "react";

export function useListeningTimer(
  deadlineAt?: number,
  speechDetected?: boolean,
  durationMs = 8000,
): ListeningTimerResult {
  const [remainingMs, setRemainingMs] = useState(durationMs);

  useEffect(() => {
    if (!deadlineAt || speechDetected) {
      if (!deadlineAt) {
        setRemainingMs(durationMs);
      }
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const left = Math.max(0, deadlineAt - now);
      setRemainingMs(left);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 32);
    return () => clearInterval(interval);
  }, [deadlineAt, durationMs, speechDetected]);

  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const progressRatio = Math.max(0, Math.min(1, remainingMs / durationMs));
  const fillPercent = Math.max(0, Math.min(100, (1 - progressRatio) * 100));

  return {
    remainingMs,
    remainingSeconds,
    progressRatio,
    fillPercent,
  };
}
