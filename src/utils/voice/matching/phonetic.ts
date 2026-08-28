import type { DoubleMetaphoneCodes } from "@/types";
import {
  doubleMetaphoneCodes,
  phoneticCodeSimilarity,
  voiceTokens,
} from "../normalize";

export function queryPhoneticCodes(value: string): DoubleMetaphoneCodes {
  return doubleMetaphoneCodes(value);
}

export function phoneticCodeScore(
  query: DoubleMetaphoneCodes,
  candidatePrimary: string | null | undefined,
  candidateSecondary: string | null | undefined,
): number {
  if (!candidatePrimary && !candidateSecondary) return 0;
  const codePairs: [string, string | null | undefined][] = [
    [query.primary, candidatePrimary],
    [query.primary, candidateSecondary],
    [query.secondary, candidatePrimary],
    [query.secondary, candidateSecondary],
  ];
  let best = 0;
  for (const [left, right] of codePairs) {
    if (!left || !right) continue;
    if (left === right) return 1;
    best = Math.max(best, phoneticCodeSimilarity(left, right));
  }
  return best;
}

export function tokenCoverageScore(
  queryTokens: string[],
  candidateNormalized: string,
): number {
  if (!queryTokens.length) return 0;
  const candidateTokens = new Set(voiceTokens(candidateNormalized));
  const matched = queryTokens.filter((token) => candidateTokens.has(token));
  return matched.length / queryTokens.length;
}

export function rarityWeightedCoverage(
  queryTokens: string[],
  candidateNormalized: string,
  rarity: Record<string, number>,
): number {
  if (!queryTokens.length) return 0;
  const candidateTokens = new Set(voiceTokens(candidateNormalized));
  let matchedWeight = 0;
  let totalWeight = 0;
  for (const token of queryTokens) {
    const weight = 0.2 + 0.8 * (rarity[token] ?? 0);
    totalWeight += weight;
    if (candidateTokens.has(token)) matchedWeight += weight;
  }
  return totalWeight ? matchedWeight / totalWeight : 0;
}
