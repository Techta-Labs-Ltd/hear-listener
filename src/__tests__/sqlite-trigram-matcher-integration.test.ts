import {
  decideResolution,
  rankEntityCandidates,
} from "@/utils/voice/matching/candidate-ranker";
import {
  phoneticCodeScore,
  rarityWeightedCoverage,
} from "@/utils/voice/matching/phonetic";
import {
  doubleMetaphoneCodes,
  phoneticCodeSimilarity,
} from "@/utils/voice/normalize";
import { DEFAULT_VOICE_RESOLVER_CONFIG } from "@/constants/voice-resolver";
import type { EntityCandidate } from "@/types";

function candidate(
  type: EntityCandidate["entityType"],
  id: string,
  name: string,
  scores: Partial<EntityCandidate["scores"]>,
): EntityCandidate {
  return {
    entityId: id,
    entityType: type,
    canonicalName: name,
    matchedAlias: name,
    matchMethod: "combined",
    popularity: 0.9,
    scores: {
      exact: 0,
      fts: 0,
      trigram: 0,
      phonetic: 0,
      context: 0,
      popularity: 0,
      final: 0,
      ...scores,
    },
  };
}

describe("SQLite trigram, phonetic and ASR matcher pipeline", () => {
  it("generates matching phonetic keys for UK homophones and misrecognitions", () => {
    const codes = doubleMetaphoneCodes("tyndale talking magazine");
    expect(codes.primary).toBe(
      doubleMetaphoneCodes("tindale talking magazine").primary,
    );
    expect(phoneticCodeSimilarity(codes.primary, codes.primary)).toBe(1);
  });

  it("scores phonetic code similarity above zero for near matches", () => {
    const query = doubleMetaphoneCodes("tinder");
    const candidate = doubleMetaphoneCodes("tyndale");
    const score = phoneticCodeScore(
      query,
      candidate.primary,
      candidate.secondary,
    );
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("weights distinctive tokens over generic suffix agreement", () => {
    const rarity = { talking: 0.2, magazine: 0.2, tyndale: 0.9 };
    const genericCoverage = rarityWeightedCoverage(
      ["tyndale", "magazine"],
      "talking magazine",
      rarity,
    );
    const distinctiveCoverage = rarityWeightedCoverage(
      ["tyndale", "magazine"],
      "tyndale talking magazine",
      rarity,
    );
    expect(genericCoverage).toBeGreaterThan(0);
    expect(distinctiveCoverage).toBeGreaterThan(genericCoverage);
  });

  it("ranks whole-phrase evidence above a generic suffix overlap", () => {
    const tyndale = candidate("publication", "tyndale-talking-magazine", "Tyndale Talking Magazine", {
      trigram: 0.9,
      phonetic: 0.85,
      fts: 0.8,
    });
    const generic = candidate("publication", "some-talking-magazine", "Some Talking Magazine", {
      trigram: 0.5,
      phonetic: 0.4,
      fts: 0.45,
    });
    const ranked = rankEntityCandidates([generic, tyndale], {
      config: DEFAULT_VOICE_RESOLVER_CONFIG,
      queryTokens: ["tinder", "talking", "magazine"],
      rarity: { tinder: 0.9, talking: 0.2, magazine: 0.2 },
    });
    expect(ranked[0].entityId).toBe("tyndale-talking-magazine");
    expect(ranked[0].confidence).toBeGreaterThan(ranked[1].confidence);
  });

  it("resolves a strong candidate and holds close candidates as ambiguity", () => {
    const strong = candidate("publication", "a", "A", {
      exact: 1,
      fts: 1,
      trigram: 1,
      phonetic: 1,
    });
    const ranked = rankEntityCandidates([strong], {
      config: DEFAULT_VOICE_RESOLVER_CONFIG,
      queryTokens: ["a"],
    });
    expect(
      decideResolution(ranked, DEFAULT_VOICE_RESOLVER_CONFIG),
    ).toMatchObject({
      kind: "resolved",
    });

    const close = [
      candidate("publication", "a", "A", { exact: 1, fts: 0.85, trigram: 0.9, phonetic: 0.9 }),
      candidate("publication", "b", "B", { exact: 1, fts: 0.85, trigram: 0.9, phonetic: 0.9 }),
    ];
    const closeRanked = rankEntityCandidates(close, {
      config: DEFAULT_VOICE_RESOLVER_CONFIG,
      queryTokens: ["x"],
    });
    expect(
      decideResolution(closeRanked, DEFAULT_VOICE_RESOLVER_CONFIG),
    ).toMatchObject({
      kind: "ambiguous",
    });
  });

  it("rejects weak evidence as unresolved instead of guessing", () => {
    const weak = candidate("publication", "w", "Weak", {
      fts: 0.3,
      trigram: 0.25,
      phonetic: 0.2,
    });
    const ranked = rankEntityCandidates([weak], {
      config: DEFAULT_VOICE_RESOLVER_CONFIG,
      queryTokens: ["something"],
    });
    expect(
      decideResolution(ranked, DEFAULT_VOICE_RESOLVER_CONFIG),
    ).toMatchObject({
      kind: "unresolved",
    });
  });
});
