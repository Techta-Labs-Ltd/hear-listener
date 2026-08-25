import type { ListeningTimerResult } from "@/types";
import { useEffect, useState } from "react";

export function useListeningTimer(
  deadlineAt?: number,
  speechDetected?: boolean,
  durationMs = 8000,
): ListeningTimerResult {
  const [remainingMs, setRemainingMs] = useState(durationMs);

  useEffect(() => {
    if (!deadlineAt || speechDetected) return;

    const updateTimer = () => {
      const left = Math.max(0, deadlineAt - Date.now());
      setRemainingMs(left);
    };

    const interval = setInterval(updateTimer, 32);
    return () => clearInterval(interval);
  }, [deadlineAt, durationMs, speechDetected]);

  const effectiveRemainingMs =
    !deadlineAt || speechDetected ? durationMs : remainingMs;
  const remainingSeconds = Math.max(0, Math.ceil(effectiveRemainingMs / 1000));
  const progressRatio = Math.max(
    0,
    Math.min(1, effectiveRemainingMs / durationMs),
  );
  const fillPercent = Math.max(0, Math.min(100, (1 - progressRatio) * 100));

  return {
    remainingMs: effectiveRemainingMs,
    remainingSeconds,
    progressRatio,
    fillPercent,
  };
}
