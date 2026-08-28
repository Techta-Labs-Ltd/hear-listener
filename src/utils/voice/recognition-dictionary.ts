import { BIAS_SOURCE_SCORES } from "@/constants/voice-dictionary";
import type { BiasTermInput } from "@/types";

export function rankBiasTerms(
  inputs: BiasTermInput[],
  limit: number,
): string[] {
  const best = new Map<string, BiasTermInput>();
  for (const input of inputs) {
    const normalized = input.term.trim().toLocaleLowerCase("en-GB");
    if (!normalized) continue;
    const existing = best.get(normalized);
    if (
      !existing ||
      BIAS_SOURCE_SCORES[input.source] > BIAS_SOURCE_SCORES[existing.source]
    ) {
      best.set(normalized, input);
    }
  }
  return [...best.values()]
    .sort((left, right) => {
      const scoreDifference =
        BIAS_SOURCE_SCORES[right.source] - BIAS_SOURCE_SCORES[left.source];
      if (scoreDifference !== 0) return scoreDifference;
      return left.term.length - right.term.length;
    })
    .slice(0, limit)
    .map((item) => item.term.trim());
}
