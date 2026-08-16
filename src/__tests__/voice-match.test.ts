import { entities, stories, topics } from "@/data/catalogue";
import { SQLiteVoiceResolver } from "@/lib/voice/resolver";
import { initialPreferences } from "@/stores/preferences-store";
import type { VoiceCandidate, VoiceTermRepository } from "@/types";

function repository(results: VoiceCandidate[]): VoiceTermRepository {
  return {
    initialize: jest.fn(),
    learnAlias: jest.fn(),
    search: jest.fn().mockResolvedValue(results),
    getVersion: jest.fn().mockResolvedValue(5),
  };
}
function request(transcript: string) {
  return {
    sessionId: "session-1",
    hypotheses: [{ transcript, confidence: 0.9, rank: 0 }],
    context: { stories, topics, entities, preferences: initialPreferences },
  };
}
const action = (
  id: string,
  phrase: string,
  key = id.split(":")[0],
  weight = 8,
): VoiceCandidate => ({
  id: 1,
  canonical: phrase,
  normalized: phrase,
  kind: "action",
  targetId: id,
  weight,
  executorKey: key as never,
  risk: "safe",
  confirmation: 0,
  source: "fts",
});

describe("SQLiteVoiceResolver", () => {
  it("queries SQLite before resolving a safety command", async () => {
    const repo = repository([action("pause", "pause")]);
    const result = await new SQLiteVoiceResolver(repo).resolve(request("paws"));
    expect(repo.search).toHaveBeenCalledWith("pause", 16, undefined);
    expect(result).toMatchObject({
      kind: "invocation",
      invocation: { command: { type: "pause" } },
    });
  });
  it("uses N-best alternatives when the first ASR hypothesis is wrong", async () => {
    const repo = repository([action("pause", "pause")]);
    const result = await new SQLiteVoiceResolver(repo).resolve({
      ...request("ports"),
      hypotheses: [
        { transcript: "ports", confidence: 0.45, rank: 0 },
        { transcript: "pause", confidence: 0.9, rank: 1 },
      ],
    });
    expect(repo.search).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      kind: "invocation",
      invocation: { command: { type: "pause" } },
    });
  });
  it("resolves an indexed story through a registered play action", async () => {
    const repo = repository([
      action("play:story", "play human side new technology", "play"),
      {
        id: 2,
        canonical: "The human side of new technology",
        normalized: "human side new technology",
        kind: "story",
        targetId: "tech",
        weight: 8,
        source: "fts",
      },
    ]);
    const result = await new SQLiteVoiceResolver(repo).resolve(
      request("play human side new technology"),
    );
    expect(result).toMatchObject({
      kind: "invocation",
      invocation: { command: { type: "play", mode: "story", storyId: "tech" } },
    });
  });
  it("asks before changing saved location and carries corrected York", async () => {
    const repo = repository([
      {
        ...action("setLocation", "set location", "setLocation"),
        risk: "privacy",
      },
      {
        id: 3,
        canonical: "York",
        normalized: "yuck",
        kind: "location",
        targetId: "GBYRK",
        weight: 8,
        source: "phonetic",
      },
    ]);
    const result = await new SQLiteVoiceResolver(repo).resolve(
      request("set location yuck"),
    );
    expect(result).toMatchObject({
      kind: "choices",
      choices: [
        { invocation: { command: { type: "setLocation", name: "York" } } },
      ],
    });
  });
  it("keeps a location query scoped to playback", async () => {
    const repo = repository([
      action("play:latest", "play latest sport from", "play"),
      {
        id: 2,
        canonical: "Sport",
        normalized: "sport",
        kind: "topic",
        targetId: "sport",
        weight: 5,
        source: "fts",
      },
      {
        id: 3,
        canonical: "York",
        normalized: "york",
        kind: "location",
        targetId: "GBYRK",
        weight: 5,
        source: "fts",
      },
    ]);
    const result = await new SQLiteVoiceResolver(repo).resolve(
      request("play latest sport from York"),
    );
    expect(result).toMatchObject({
      kind: "invocation",
      invocation: {
        command: {
          type: "play",
          mode: "latest",
          topicId: "sport",
          locationId: "GBYRK",
        },
      },
    });
    expect(result).not.toMatchObject({
      invocation: { command: { type: "setLocation" } },
    });
  });
  it("returns clarification for competing actions", async () => {
    const repo = repository([
      action("pause", "pause", "pause", 2),
      { ...action("play:current", "play", "play", 2), id: 2 },
    ]);
    const result = await new SQLiteVoiceResolver(repo).resolve(request("pa"));
    expect(["choices", "unrecognized"]).toContain(result.kind);
  });
  it("resolves Bluetooth settings as an executable app action", async () => {
    const repo = repository([
      action("openBluetoothSettings", "bluetooth settings"),
    ]);
    const result = await new SQLiteVoiceResolver(repo).resolve(
      request("bluetooth settings"),
    );
    expect(result).toMatchObject({
      kind: "invocation",
      invocation: {
        executorKey: "openBluetoothSettings",
        command: { type: "openBluetoothSettings" },
      },
    });
  });
  it("resolves a corrected location-settings phrase", async () => {
    const repo = repository([
      action("openLocationSettings", "location settings"),
    ]);
    const result = await new SQLiteVoiceResolver(repo).resolve(
      request("location settings"),
    );
    expect(result).toMatchObject({
      kind: "invocation",
      invocation: { command: { type: "openLocationSettings" } },
    });
  });
});
