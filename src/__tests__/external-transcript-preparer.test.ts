import { ExternalTranscriptPreparer } from "@/services/voice/external-transcript-preparer";
import type { EntityCandidate, VoiceEntityRepository } from "@/types";

function candidate(canonicalName: string): EntityCandidate {
  return {
    entityId: "tag:bible-study",
    entityType: "tag",
    canonicalName,
    matchedAlias: "bibble study",
    matchMethod: "combined",
    popularity: 1,
    scores: {
      exact: 1,
      fts: 1,
      trigram: 1,
      phonetic: 1,
      context: 0,
      popularity: 1,
      final: 0,
    },
  };
}

function repository(results: EntityCandidate[]): VoiceEntityRepository {
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    isReady: jest.fn().mockResolvedValue(true),
    searchEntities: jest.fn().mockResolvedValue(results),
    getEntity: jest.fn().mockResolvedValue(null),
    getEntitiesByIds: jest.fn().mockResolvedValue([]),
    getRevision: jest.fn().mockResolvedValue("test"),
    healthCheck: jest.fn().mockResolvedValue({
      ready: true,
      schemaVersion: 1,
      contentRevision: "test",
      entityCount: 1,
      aliasCount: 1,
      ftsReady: true,
      phoneticReady: true,
    }),
    getContextualTerms: jest.fn().mockResolvedValue([]),
    getTokenRarity: jest.fn().mockResolvedValue({}),
    learnAlias: jest.fn().mockResolvedValue(undefined),
    resetLearnedAliases: jest.fn().mockResolvedValue(undefined),
  };
}

describe("ExternalTranscriptPreparer", () => {
  it("canonicalises a high-confidence ASR phrase without creating playback", async () => {
    const repo = repository([candidate("#Bible-Study")]);
    const preparer = new ExternalTranscriptPreparer(repo);

    const result = await preparer.prepare("play bibble study");

    expect(result).toEqual({
      originalTranscript: "play bibble study",
      preparedTranscript: "play Bible-Study",
      corrections: [
        {
          original: "bibble study",
          canonical: "Bible-Study",
          entityType: "tag",
        },
      ],
    });
    expect(repo.searchEntities).toHaveBeenCalled();
  });

  it("leaves weak or missing FTS matches for the external resolver", async () => {
    const preparer = new ExternalTranscriptPreparer(repository([]));
    await expect(preparer.prepare("play an unknown programme")).resolves.toMatchObject({
      originalTranscript: "play an unknown programme",
      preparedTranscript: "play an unknown programme",
      corrections: [],
    });
  });
});
