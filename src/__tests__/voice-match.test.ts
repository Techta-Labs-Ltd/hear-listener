import { SQLiteVoiceResolver } from "@/services/voice/resolver";
import { initialPreferences } from "@/stores/preferences-store";
import type {
  EntityCandidate,
  EntityType,
  VoiceEntityRepository,
} from "@/types";

function repository(
  candidatesByQuery: Record<string, EntityCandidate[]> = {},
  ready = true,
): VoiceEntityRepository & { searchEntities: jest.Mock } {
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    isReady: jest.fn().mockResolvedValue(ready),
    searchEntities: jest.fn(
      async (query: { normalizedText: string }) =>
        candidatesByQuery[query.normalizedText] ?? [],
    ),
    getEntity: jest.fn(),
    getEntitiesByIds: jest.fn(),
    getRevision: jest.fn().mockResolvedValue("test-revision"),
    healthCheck: jest.fn(),
    getContextualTerms: jest.fn(),
    getTokenRarity: jest.fn().mockResolvedValue({}),
    learnAlias: jest.fn(),
    resetLearnedAliases: jest.fn(),
  };
}

function candidate(
  type: EntityType,
  id: string,
  name: string,
  scores: Partial<EntityCandidate["scores"]> = {},
  metadata?: Record<string, unknown>,
): EntityCandidate {
  return {
    entityId: id,
    entityType: type,
    canonicalName: name,
    matchedAlias: name,
    matchMethod: "exact",
    popularity: 0.9,
    metadata,
    scores: {
      exact: 1,
      fts: 0.9,
      trigram: 1,
      phonetic: 1,
      context: 0,
      popularity: 0,
      final: 0,
      ...scores,
    },
  };
}

function request(transcript: string, screenId?: string) {
  return {
    sessionId: "session-1",
    hypotheses: [{ transcript, confidence: 0.9, rank: 0 }],
    context: {
      screenId,
      currentPath: screenId === "onboarding" ? "/onboarding" : "/",
      preferences: initialPreferences,
    },
  };
}

const TYNDALE_PUBLICATION = candidate(
  "publication",
  "tyndale-talking-magazine",
  "Tyndale Talking Magazine",
  {},
  { storyIds: ["tyndale-edition"] },
);

describe("SQLiteVoiceResolver", () => {
  it("resolves a publication with the latest modifier through a from relation", async () => {
    const repo = repository({
      "tyndale talking magazine": [TYNDALE_PUBLICATION],
    });
    const result = await new SQLiteVoiceResolver(repo).resolve(
      request("play the latest publication from tyndale talking magazine"),
    );
    expect(result).toMatchObject({
      kind: "invocation",
      invocation: {
        command: {
          type: "play",
          mode: "latest",
          entityId: "tyndale-talking-magazine",
          entityName: "Tyndale Talking Magazine",
        },
        slots: { entityType: "publication" },
      },
    });
    expect(repo.searchEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        normalizedText: "tyndale talking magazine",
        expectedTypes: ["organization", "publication", "location"],
      }),
    );
  });

  it("plays a publication by its stored story id when no modifier is present", async () => {
    const repo = repository({
      "tyndale talking magazine": [TYNDALE_PUBLICATION],
    });
    const result = await new SQLiteVoiceResolver(repo).resolve(
      request("tyndale talking magazine"),
    );
    expect(result).toMatchObject({
      kind: "invocation",
      invocation: {
        command: { type: "play", mode: "story", storyId: "tyndale-edition" },
      },
    });
  });

  it("recovers a validated ASR alias through the same generic pipeline", async () => {
    const tinder = {
      ...TYNDALE_PUBLICATION,
      matchedAlias: "tinder talking magazine",
    };
    const repo = repository({ "tinder talking magazine": [tinder] });
    const result = await new SQLiteVoiceResolver(repo).resolve(
      request("play tinder talking magazine"),
    );
    expect(result).toMatchObject({
      kind: "invocation",
      invocation: {
        command: { type: "play", mode: "story", storyId: "tyndale-edition" },
      },
    });
  });

  it("opens a category topic for find requests", async () => {
    const repo = repository({
      technology: [candidate("category", "technology", "Technology")],
    });
    const result = await new SQLiteVoiceResolver(repo).resolve(
      request("find technology"),
    );
    expect(result).toMatchObject({
      kind: "invocation",
      invocation: { command: { type: "openTopic", topicId: "technology" } },
    });
  });

  it("maps a bare category phrase to a latest-topic play", async () => {
    const repo = repository({
      technology: [candidate("category", "technology", "Technology")],
    });
    const result = await new SQLiteVoiceResolver(repo).resolve(
      request("technology"),
    );
    expect(result).toMatchObject({
      kind: "invocation",
      invocation: {
        command: { type: "play", mode: "latest", topicId: "technology" },
      },
    });
  });

  it("asks for confirmation when changing saved location", async () => {
    const repo = repository({
      bristol: [candidate("location", "bristol", "Bristol")],
    });
    const result = await new SQLiteVoiceResolver(repo).resolve(
      request("bristol"),
    );
    expect(result).toMatchObject({
      kind: "invocation",
      invocation: {
        executorKey: "setLocation",
        command: { type: "setLocation", name: "Bristol" },
        risk: "privacy",
        requiresConfirmation: true,
      },
    });
  });

  it("routes bare locations into the onboarding town flow on the onboarding screen", async () => {
    const repo = repository({
      edinburgh: [candidate("location", "GBEDH", "Edinburgh")],
    });
    const result = await new SQLiteVoiceResolver(repo).resolve(
      request("edinburgh", "onboarding"),
    );
    expect(result).toMatchObject({
      kind: "invocation",
      invocation: {
        command: { type: "onboardingSetTown", name: "Edinburgh" },
      },
    });
  });

  it("follows a named creator without hardcoded entity knowledge", async () => {
    const repo = repository({
      "signal and noise": [
        candidate("creator", "signal-noise", "Signal & Noise"),
      ],
    });
    const result = await new SQLiteVoiceResolver(repo).resolve(
      request("follow signal and noise"),
    );
    expect(result).toMatchObject({
      kind: "invocation",
      invocation: {
        command: { type: "follow", entityId: "signal-noise" },
      },
    });
  });

  it("returns clarification choices when close candidates compete", async () => {
    const first = candidate(
      "publication",
      "tyndale-talking-magazine",
      "Tyndale Talking Magazine",
      { exact: 1, fts: 0.85, trigram: 0.9, phonetic: 0.9 },
    );
    const second = candidate(
      "publication",
      "talking-books",
      "Talking Books",
      { exact: 1, fts: 0.85, trigram: 0.9, phonetic: 0.9 },
    );
    const repo = repository({
      "talking magazine": [first, second],
    });
    const result = await new SQLiteVoiceResolver(repo).resolve(
      request("play talking magazine"),
    );
    expect(result).toMatchObject({ kind: "choices" });
    if (result.kind === "choices") {
      expect(result.choices.length).toBe(2);
      expect(result.choices[0].label).toBe("Tyndale Talking Magazine");
      expect(result.choices[0].invocation).toBeDefined();
    }
  });

  it("returns a modifier-only play when no entity matches", async () => {
    const repo = repository({});
    const result = await new SQLiteVoiceResolver(repo).resolve(
      request("play the latest"),
    );
    expect(result).toMatchObject({
      kind: "invocation",
      invocation: { command: { type: "play", mode: "latest" } },
    });
  });

  it("returns unrecognized when nothing matches and no modifier applies", async () => {
    const repo = repository({});
    const result = await new SQLiteVoiceResolver(repo).resolve(
      request("play something strange"),
    );
    expect(result.kind).toBe("unrecognized");
  });

  it("reports index-unavailable instead of failing when the DB is not ready", async () => {
    const repo = repository({}, false);
    const result = await new SQLiteVoiceResolver(repo).resolve(
      request("play tyndale talking magazine"),
    );
    expect(result).toMatchObject({
      kind: "unrecognized",
      reason: "index-unavailable",
    });
  });

  it("uses N-best alternatives when the first hypothesis fails", async () => {
    const repo = repository({
      "tyndale talking magazine": [TYNDALE_PUBLICATION],
    });
    const result = await new SQLiteVoiceResolver(repo).resolve({
      ...request(""),
      hypotheses: [
        { transcript: "play tin dial talking magazine", confidence: 0.4, rank: 0 },
        { transcript: "tyndale talking magazine", confidence: 0.9, rank: 1 },
      ],
    });
    expect(result).toMatchObject({
      kind: "invocation",
      invocation: {
        command: { type: "play", mode: "story", storyId: "tyndale-edition" },
      },
    });
  });
});
