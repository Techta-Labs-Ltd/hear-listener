import {
  editDistance,
  normalizeVoiceText,
  phoneticKey,
  scoreVoiceCandidate,
  voiceTrigrams,
} from "@/services/voice/normalize";
import { SQLiteVoiceResolver } from "@/services/voice/resolver";
import { initialPreferences } from "@/stores/preferences-store";
import { stories, topics, entities } from "@/data/catalogue";
import type { VoiceCandidate, VoiceTermRepository } from "@/types";

describe("SQLite Trigram, Phonetic & ASR Matcher Integration", () => {
  describe("1. Trigram & Phonetic Extraction", () => {
    it("generates 3-character sliding trigrams from normalized speech", () => {
      const grams = voiceTrigrams("play local news");
      expect(grams.some((g) => g.includes("pla"))).toBe(true);
      expect(grams.some((g) => g.includes("lay"))).toBe(true);
      expect(grams.some((g) => g.includes("loc"))).toBe(true);
      expect(grams.some((g) => g.includes("new"))).toBe(true);
    });

    it("handles short terms cleanly without breaking trigram generator", () => {
      expect(voiceTrigrams("go")).toEqual(["  g", " go", "go ", "o  "]);
      expect(voiceTrigrams("")).toEqual([]);
    });

    it("generates matching phonetic keys for UK homophones and misrecognitions", () => {
      expect(phoneticKey("colour")).toBe(phoneticKey("color"));
      expect(phoneticKey("centre")).toBe(phoneticKey("center"));
      expect(phoneticKey("theater")).toBe(phoneticKey("theatre"));
      expect(phoneticKey("tindale talking magazine")).toBe(
        phoneticKey("tyndale talking magazine"),
      );
    });

    it("normalizes colloquial speech, ASR punctuation and numbers", () => {
      expect(normalizeVoiceText("Pause, please.")).toBe("pause please");
      expect(normalizeVoiceText("What's on?")).toBe("what is on");
      expect(normalizeVoiceText("twenty five minutes")).toBe("20 5 minutes");
      expect(normalizeVoiceText("play ***** magazine")).toBe("play magazine");
    });
  });

  describe("2. Fuzzy Scoring & Candidate Ranking", () => {
    it("ranks exact matches higher than fuzzy partial matches", () => {
      const exactScore = scoreVoiceCandidate("open library", "open library");
      const fuzzyScore = scoreVoiceCandidate("open libary", "open library");
      expect(exactScore).toBe(1);
      expect(fuzzyScore).toBeGreaterThan(0.7);
    });

    it("computes Levenshtein distance accurately for misheard phrases", () => {
      expect(editDistance("settings", "setings")).toBe(1);
      expect(editDistance("library", "libary")).toBe(1);
      expect(editDistance("discover", "disco")).toBe(3);
    });
  });

  describe("3. SQLite Resolver with Trigrams & Multi-Hypothesis N-best ASR", () => {
    it("correctly matches ASR hypothesis against SQLite trigram and FTS candidates", async () => {
      const mockCandidates: VoiceCandidate[] = [
        {
          id: 101,
          canonical: "Play local news",
          normalized: "play local news",
          kind: "action",
          targetId: "play:local",
          weight: 10,
          executorKey: "play",
          risk: "safe",
          confirmation: 0,
          source: "trigram",
        },
      ];

      const mockRepo: VoiceTermRepository = {
        initialize: jest.fn().mockResolvedValue(undefined),
        learnAlias: jest.fn().mockResolvedValue(undefined),
        search: jest.fn().mockResolvedValue(mockCandidates),
        getVersion: jest.fn().mockResolvedValue(5),
      };

      const resolver = new SQLiteVoiceResolver(mockRepo);
      const result = await resolver.resolve({
        sessionId: "sess_test_1",
        hypotheses: [
          { transcript: "play local", confidence: 0.75, rank: 0 },
          { transcript: "play local news", confidence: 0.95, rank: 1 },
        ],
        context: {
          stories,
          topics,
          entities,
          preferences: initialPreferences,
        },
      });

      expect(mockRepo.search).toHaveBeenCalled();
      expect(result.kind).toBe("invocation");
      if (result.kind === "invocation") {
        expect(result.invocation.command).toMatchObject({
          type: "play",
        });
      }
    });

    it("routes unrecognised semantic queries to remote resolver", async () => {
      const mockRepo: VoiceTermRepository = {
        initialize: jest.fn().mockResolvedValue(undefined),
        learnAlias: jest.fn().mockResolvedValue(undefined),
        search: jest.fn().mockResolvedValue([]),
        getVersion: jest.fn().mockResolvedValue(5),
      };

      const resolver = new SQLiteVoiceResolver(mockRepo);
      const result = await resolver.resolve({
        sessionId: "sess_test_2",
        hypotheses: [{ transcript: "find audio about space exploration in oxford", confidence: 0.9, rank: 0 }],
        context: {
          stories,
          topics,
          entities,
          preferences: initialPreferences,
        },
      });

      expect(result.kind).toBe("unrecognized");
    });

    it("directly matches 'tyndale talking magazine' to play tyndale edition", async () => {
      const mockRepo: VoiceTermRepository = {
        initialize: jest.fn().mockResolvedValue(undefined),
        learnAlias: jest.fn().mockResolvedValue(undefined),
        search: jest.fn().mockResolvedValue([]),
        getVersion: jest.fn().mockResolvedValue(5),
      };

      const resolver = new SQLiteVoiceResolver(mockRepo);
      const result = await resolver.resolve({
        sessionId: "sess_test_3",
        hypotheses: [{ transcript: "tyndale talking magazine", confidence: 0.95, rank: 0 }],
        context: {
          stories,
          topics,
          entities,
          preferences: initialPreferences,
        },
      });

      expect(result.kind).toBe("invocation");
      if (result.kind === "invocation") {
        expect(result.invocation.command).toMatchObject({
          type: "play",
          storyId: "tyndale-edition",
        });
      }
    });

    it("resolves location commands like 'play news in Bristol'", async () => {
      const mockRepo: VoiceTermRepository = {
        initialize: jest.fn().mockResolvedValue(undefined),
        learnAlias: jest.fn().mockResolvedValue(undefined),
        search: jest.fn().mockResolvedValue([]),
        getVersion: jest.fn().mockResolvedValue(5),
      };

      const resolver = new SQLiteVoiceResolver(mockRepo);
      const result = await resolver.resolve({
        sessionId: "sess_test_4",
        hypotheses: [{ transcript: "play news in Bristol", confidence: 0.95, rank: 0 }],
        context: {
          stories,
          topics,
          entities,
          preferences: initialPreferences,
        },
      });

      expect(result.kind).toBe("invocation");
      if (result.kind === "invocation") {
        expect(result.invocation.command).toMatchObject({
          type: "setLocation",
          locationId: "bristol",
        });
      }
    });
  });
});

