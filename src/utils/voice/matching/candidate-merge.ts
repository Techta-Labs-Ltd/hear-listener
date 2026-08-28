import type { EntityCandidate, EntityType } from "@/types";

const createEmptyScores = () => ({
  exact: 0,
  fts: 0,
  trigram: 0,
  phonetic: 0,
  context: 0,
  popularity: 0,
  final: 0,
});

export function mergeCandidates(
  candidates: EntityCandidate[],
): EntityCandidate[] {
  const merged = new Map<string, EntityCandidate>();
  for (const candidate of candidates) {
    const key = `${candidate.entityType}:${candidate.entityId}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        ...candidate,
        scores: { ...createEmptyScores(), ...candidate.scores },
      });
      continue;
    }
    existing.scores.exact = Math.max(existing.scores.exact, candidate.scores.exact);
    existing.scores.fts = Math.max(existing.scores.fts, candidate.scores.fts);
    existing.scores.trigram = Math.max(
      existing.scores.trigram,
      candidate.scores.trigram,
    );
    existing.scores.phonetic = Math.max(
      existing.scores.phonetic,
      candidate.scores.phonetic,
    );
    if (
      !existing.matchedAlias ||
      (candidate.matchedAlias &&
        strength(candidate.matchMethod) > strength(existing.matchMethod))
    ) {
      existing.matchedAlias = candidate.matchedAlias;
      existing.matchMethod = candidate.matchMethod;
    }
    existing.metadata = candidate.metadata ?? existing.metadata;
  }
  return [...merged.values()];
}

function strength(method: EntityCandidate["matchMethod"]): number {
  switch (method) {
    case "exact":
      return 4;
    case "fts":
      return 3;
    case "trigram":
      return 2;
    case "phonetic":
      return 1;
    default:
      return 0;
  }
}

export function candidateKey(type: EntityType, id: string): string {
  return `${type}:${id}`;
}
