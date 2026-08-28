import type { VoiceDiagnostic } from "@/types";

export function latencyBand(
  milliseconds: number,
): VoiceDiagnostic["latencyBand"] {
  return milliseconds < 100
    ? "under-100ms"
    : milliseconds < 300
      ? "100-300ms"
      : milliseconds < 1000
        ? "300ms-1s"
        : "over-1s";
}

export function confidenceBand(
  value: number,
): VoiceDiagnostic["confidenceBand"] {
  return value >= 0.79 ? "high" : value >= 0.48 ? "medium" : "low";
}
