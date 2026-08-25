import type { ResolverConfig } from "@/types";

export const defaultResolverConfig: ResolverConfig = {
  resolvedThreshold: 0.84,
  minMargin: 0.08,
  ambiguityFloor: 0.58,
  weights: {
    exact: 0.35,
    fts: 0.2,
    trigram: 0.2,
    phonetic: 0.15,
    context: 0.08,
    popularity: 0.02,
  },
  limits: {
    exact: 8,
    fts: 20,
    trigram: 20,
    phonetic: 20,
    mergedPool: 30,
    ambiguityChoices: 5,
    maxWindows: 12,
  },
};
