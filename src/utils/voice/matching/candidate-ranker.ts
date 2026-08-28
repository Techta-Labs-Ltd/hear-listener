import type {
  EntityCandidate,
  EntityRelation,
  EntityType,
  RankedEntityCandidate,
  ResolutionDecision,
  ResolverConfig,
} from "@/types";
import { rarityWeightedCoverage } from "./phonetic";

function clampUnitInterval(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function rankEntityCandidates(
  candidates: EntityCandidate[],
  options: {
    config: ResolverConfig;
    expectedTypes?: EntityType[];
    relation?: EntityRelation;
    rarity?: Record<string, number>;
    queryTokens: string[];
  },
): RankedEntityCandidate[] {
  const { config, rarity } = options;
  const expectedTypes = options.expectedTypes ?? [];
  const ranked = candidates.map((candidate) => {
    const scores = { ...candidate.scores };
    const text =
      candidate.matchedAlias && candidate.matchedAlias !== candidate.canonicalName
        ? `${candidate.canonicalName} ${candidate.matchedAlias}`
        : candidate.canonicalName;
    const distinctive = rarity
      ? rarityWeightedCoverage(options.queryTokens, text, rarity)
      : 0;
    scores.trigram = clampUnitInterval(
      scores.trigram * 0.55 + distinctive * 0.45,
    );
    scores.context = expectedTypes.length
      ? expectedTypes.includes(candidate.entityType)
        ? 1
        : 0
      : 0.5;
    scores.popularity = clampUnitInterval(candidate.popularity);
    const weights = config.weights;
    const final = clampUnitInterval(
      scores.exact * weights.exact +
      scores.fts * weights.fts +
      scores.trigram * weights.trigram +
      scores.phonetic * weights.phonetic +
      scores.context * weights.context +
      scores.popularity * weights.popularity,
    );
    return {
      ...candidate,
      scores: { ...scores, final },
      confidence: final,
    };
  });
  return ranked.sort(
    (left, right) =>
      right.confidence - left.confidence ||
      right.popularity - left.popularity,
  );
}

export function decideResolution(
  ranked: RankedEntityCandidate[],
  config: ResolverConfig,
): ResolutionDecision {
  const top = ranked[0];
  if (!top || top.confidence < config.ambiguityFloor) {
    return { kind: "unresolved" };
  }
  if (
    top.confidence >= config.resolvedThreshold &&
    (!ranked[1] || top.confidence - ranked[1].confidence >= config.minMargin)
  ) {
    return { kind: "resolved", candidate: top };
  }
  const margin = Math.max(config.minMargin, 0.04);
  const close = ranked.filter(
    (candidate) =>
      top.confidence - candidate.confidence <= margin ||
      candidate.entityType === top.entityType,
  );
  return {
    kind: "ambiguous",
    candidates: close.slice(0, config.limits.ambiguityChoices),
  };
}
