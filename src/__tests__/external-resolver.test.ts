import { HttpExternalVoiceResolver } from "@/services/voice/external-resolver-service";
import type { ExternalResolverRequest } from "@/types";
import {
  buildHearSearchRequest,
  buildSearchConfirmationLabel,
  parseHearResolverResult,
  parseHearSearchResponse,
} from "@/utils/voice/hear-api";

const request: ExternalResolverRequest = {
  originalTranscript: "play the latest heatwave",
  preparedTranscript: "play the latest heatwave",
  locale: "en-GB",
  timezone: "Europe/London",
  country: "gb",
  voiceSessionId: "voice-1",
  requestId: "request-1",
  installationId: "install-1",
};

const heatwaveResolution = {
  status: "resolved",
  intent: "category",
  entities: [
    {
      entityType: "category",
      entityId: "heatwave",
      canonicalValue: "Heatwave",
      originalText: "heatwave",
      confidence: 100,
      method: "bare_match",
      start: 16,
      end: 24,
      latitude: null,
      longitude: null,
      countryCode: null,
      locationRole: null,
    },
  ],
  slots: {
    residualQuery: "",
    latest: true,
    isRecommended: false,
    isPublication: false,
    sort: "latest",
    publishedFrom: null,
    publishedTo: null,
  },
  ambiguities: [],
  timingMs: 16.167,
};

const playableSearchResponse = {
  results: [
    {
      contentId: "track-1",
      audioUrl: "https://audio.hear.media/track.mp3",
      title: "Morning update",
      spokenTitle: "Morning update",
      creator: { id: "creator-1", name: "Hear! contributor" },
      durationSecs: 125,
    },
  ],
  page: 0,
  limit: 3,
  total: 1,
  totalPages: 1,
  remaining: 0,
  isLocal: false,
  isRecommended: false,
};

describe("real Hear resolver and search integration", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls the real /resolve contract and searches only after confirmation", async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(heatwaveResolution))
      .mockResolvedValueOnce(jsonResponse(playableSearchResponse));
    const resolver = configuredResolver();

    const confirmation = await resolver.resolve(request);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      "https://resolver.hear.media/resolve",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-api-key": "test-key" }),
      }),
    );
    const resolveOptions = (globalThis.fetch as jest.Mock).mock.calls[0][1];
    expect(JSON.parse(resolveOptions.body)).toEqual({
      utterance: "play the latest heatwave",
      timezone: "Europe/London",
      country_code: "gb",
    });
    expect(confirmation).toMatchObject({
      kind: "confirmation",
      confirmationLabel: "the latest content on Heatwave",
      prompt: "Did you want me to play the latest content on Heatwave?",
    });
    if (confirmation.kind !== "confirmation") throw new Error("Expected confirmation");

    const playback = await resolver.continue({
      interactionToken: confirmation.interactionToken,
      voiceSessionId: request.voiceSessionId,
      requestId: "request-2",
      installationId: request.installationId,
      action: { kind: "confirm", approved: true },
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      "https://alexa.hear.media/api/v1/alexa/search",
      expect.objectContaining({ method: "POST" }),
    );
    const searchOptions = (globalThis.fetch as jest.Mock).mock.calls[1][1];
    expect(JSON.parse(searchOptions.body)).toEqual({
      q: "",
      filter: { categorySlugs: ["heatwave"] },
      sort: "latest",
      isLocal: false,
      isRecommended: false,
      page: 0,
      limit: 3,
    });
    expect(playback).toMatchObject({
      kind: "playback",
      total: 1,
      tracks: [{ contentId: "track-1", durationSeconds: 125 }],
    });

    await expect(
      resolver.continue({
        interactionToken: confirmation.interactionToken,
        voiceSessionId: request.voiceSessionId,
        requestId: "request-3",
        installationId: request.installationId,
        action: { kind: "confirm", approved: true },
      }),
    ).resolves.toMatchObject({ kind: "error", code: "interaction-expired" });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("treats ambiguities as authoritative, deduplicates names, and selects locally", async () => {
    const ambiguityResolution = {
      status: "resolved",
      intent: "search",
      entities: [],
      slots: {
        residualQuery: "",
        latest: false,
        isRecommended: false,
        isPublication: false,
        sort: "relevance",
        publishedFrom: null,
        publishedTo: null,
      },
      ambiguities: [
        {
          phrase: "pendle voice",
          candidates: [
            candidate("creator", "creator-1", "Pendle Voice Dalesman"),
            candidate("creator", "creator-2", "Pendle Voice Lancashire Life"),
            candidate("creator", "creator-3", "Pendle Voice Leader and Times"),
            candidate("organization", "org-1", "Pendle Voice Dalesman"),
            candidate("organization", "org-2", "Pendle Voice Lancashire Life"),
          ],
        },
      ],
      timingMs: 84.754,
    };
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(ambiguityResolution))
      .mockResolvedValueOnce(jsonResponse(playableSearchResponse));
    const resolver = configuredResolver();

    const ambiguity = await resolver.resolve({
      ...request,
      originalTranscript: "play pendle voice",
      preparedTranscript: "play pendle voice",
    });

    expect(ambiguity).toMatchObject({
      kind: "ambiguity",
      choices: [
        { id: "creator:creator-1", label: "Pendle Voice Dalesman" },
        { id: "creator:creator-2", label: "Pendle Voice Lancashire Life" },
        { id: "creator:creator-3", label: "Pendle Voice Leader and Times" },
      ],
    });
    if (ambiguity.kind !== "ambiguity") throw new Error("Expected ambiguity");
    expect(ambiguity.prompt).toContain("distinguishing part");

    const confirmation = await resolver.continue({
      interactionToken: ambiguity.interactionToken,
      voiceSessionId: request.voiceSessionId,
      requestId: "request-2",
      installationId: request.installationId,
      action: { kind: "select", candidateId: "creator:creator-2" },
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(confirmation).toMatchObject({
      kind: "confirmation",
      confirmationLabel: "content from Pendle Voice Lancashire Life",
      prompt: "Did you mean Pendle Voice Lancashire Life?",
    });
    if (confirmation.kind !== "confirmation") throw new Error("Expected confirmation");

    await resolver.continue({
      interactionToken: confirmation.interactionToken,
      voiceSessionId: request.voiceSessionId,
      requestId: "request-3",
      installationId: request.installationId,
      action: { kind: "confirm", approved: true },
    });
    const searchOptions = (globalThis.fetch as jest.Mock).mock.calls[1][1];
    expect(JSON.parse(searchOptions.body)).toEqual({
      q: "",
      filter: { creatorIds: ["creator-2"] },
      isLocal: false,
      isRecommended: false,
      page: 0,
      limit: 3,
    });
  });

  it("requires a configured key without attempting a request", async () => {
    globalThis.fetch = jest.fn();
    const resolver = new HttpExternalVoiceResolver({ apiKey: "" });

    await expect(resolver.resolve(request)).resolves.toMatchObject({
      kind: "error",
      code: "missing-api-key",
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("maps rate limiting to one typed service error", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 });

    await expect(configuredResolver().resolve(request)).resolves.toMatchObject({
      kind: "error",
      code: "rate-limited",
      retryable: true,
    });
  });
});

describe("Hear API contract transformations", () => {
  it("validates 0-100 confidence and maps dates and supported flags", () => {
    const parsed = parseHearResolverResult({
      ...heatwaveResolution,
      entities: [
        {
          ...heatwaveResolution.entities[0],
          entityType: "tag",
          entityId: "bible-study",
          canonicalValue: "#bible-study",
          confidence: 100,
        },
      ],
      slots: {
        ...heatwaveResolution.slots,
        latest: false,
        isRecommended: true,
        isPublication: true,
        sort: "relevance",
        publishedFrom: 1_780_272_000,
        publishedTo: 1_782_864_000,
      },
    });
    expect(parsed).toBeDefined();
    expect(buildHearSearchRequest(parsed!)).toEqual({
      q: "",
      filter: {
        tags: ["bible-study"],
        isPublication: true,
        publishedFrom: 1_780_272_000,
        publishedTo: 1_782_864_000,
      },
      isLocal: false,
      isRecommended: true,
      page: 0,
      limit: 3,
    });
    expect(
      parseHearResolverResult({
        ...heatwaveResolution,
        entities: [{ ...heatwaveResolution.entities[0], confidence: 101 }],
      }),
    ).toBeUndefined();
  });

  it("passes exact category and distinct multiple-tag matches as direct filters", () => {
    const parsed = parseHearResolverResult({
      ...heatwaveResolution,
      intent: "search",
      entities: [
        {
          ...heatwaveResolution.entities[0],
          entityId: "history",
          canonicalValue: "History",
          originalText: "history",
          start: 5,
          end: 12,
        },
        {
          ...heatwaveResolution.entities[0],
          entityType: "tag",
          entityId: "history",
          canonicalValue: "#history",
          originalText: "history",
          start: 5,
          end: 12,
        },
        {
          ...heatwaveResolution.entities[0],
          entityType: "tag",
          entityId: "british-history",
          canonicalValue: "#british-history",
          originalText: "british history",
          start: 13,
          end: 28,
        },
        {
          ...heatwaveResolution.entities[0],
          entityType: "tag",
          entityId: "social-history",
          canonicalValue: "#social-history",
          originalText: "social history",
          start: 29,
          end: 43,
        },
      ],
      slots: {
        ...heatwaveResolution.slots,
        latest: false,
        sort: "relevance",
      },
    });

    expect(buildHearSearchRequest(parsed!)).toEqual({
      q: "",
      filter: {
        categorySlugs: ["history"],
        tags: ["british-history", "social-history"],
      },
      isLocal: false,
      isRecommended: false,
      page: 0,
      limit: 3,
    });
  });

  it("keeps non-exact taxonomy text in free-text search instead of an exact filter", () => {
    const parsed = parseHearResolverResult({
      ...heatwaveResolution,
      entities: [
        {
          ...heatwaveResolution.entities[0],
          entityType: "tag",
          entityId: "oral-history",
          canonicalValue: "#oral-history",
          originalText: "oral history",
          confidence: 99,
        },
      ],
      slots: {
        ...heatwaveResolution.slots,
        latest: false,
        sort: "relevance",
      },
    });

    expect(buildHearSearchRequest(parsed!)).toEqual({
      q: "Oral history",
      isLocal: false,
      isRecommended: false,
      page: 0,
      limit: 3,
    });
  });

  it("describes a topic as content on that topic", () => {
    const parsed = parseHearResolverResult({
      ...heatwaveResolution,
      entities: [
        {
          ...heatwaveResolution.entities[0],
          entityId: "history",
          canonicalValue: "History",
          originalText: "history",
        },
      ],
      slots: {
        ...heatwaveResolution.slots,
        latest: false,
        sort: "relevance",
      },
    });

    expect(buildSearchConfirmationLabel(parsed!)).toBe("content on History");
  });

  it("builds the complete hear-py confirmation meaning instead of echoing ASR", () => {
    const parsed = parseHearResolverResult({
      ...heatwaveResolution,
      intent: "category",
      entities: [
        {
          ...heatwaveResolution.entities[0],
          entityId: "sport",
          canonicalValue: "sport",
          originalText: "sports",
          start: 16,
          end: 22,
          confidence: 98,
        },
        {
          ...heatwaveResolution.entities[0],
          entityType: "organization",
          entityId: "39d2bc65-06a8-443f-8686-2197fb49dee8",
          canonicalValue: "York Talking News",
          originalText: "ytn",
          start: 35,
          end: 38,
          confidence: 95,
        },
      ],
      slots: {
        ...heatwaveResolution.slots,
        residualQuery: "update",
      },
    });

    expect(parsed).toBeDefined();
    expect(buildSearchConfirmationLabel(parsed!)).toBe(
      "the latest Sport Update from York Talking News",
    );
  });

  it("flattens publications, uses readable titles, and rejects insecure audio", () => {
    const result = parseHearSearchResponse({
      results: [
        {
          contentId: "publication-1",
          type: "publication",
          title: "Community Monthly",
          tracks: [
            {
              contentId: "track-1",
              audioUrl: "https://audio.hear.media/track.mp3",
              title: "11_Pastoral_Letter.mp3",
              shortDescription: "A call to action for young people",
              creator: "Lichfield Diocesan Digest",
              playbackSpeeds: [
                { speed: 1.5, url: "https://audio.hear.media/track-1-5.mp3" },
              ],
            },
            {
              contentId: "track-2",
              audioUrl: "http://insecure.example/track.mp3",
              title: "Unsafe",
            },
          ],
        },
      ],
      total: 2,
    });

    expect(result).toEqual({
      total: 2,
      tracks: [
        expect.objectContaining({
          contentId: "track-1",
          title: "A call to action for young people",
          spokenTitle: "A call to action for young people",
          creator: { name: "Lichfield Diocesan Digest" },
          publication: { id: "publication-1", title: "Community Monthly" },
          publicationTrackIndex: 0,
          publicationTrackCount: 2,
          playbackSpeedUrls: [
            { speed: 1.5, url: "https://audio.hear.media/track-1-5.mp3" },
          ],
        }),
      ],
    });
  });
});

function configuredResolver(): HttpExternalVoiceResolver {
  return new HttpExternalVoiceResolver({ apiKey: "test-key" });
}

function jsonResponse(value: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => value,
  } as Response;
}

function candidate(entityType: string, entityId: string, canonicalValue: string) {
  return { entityType, entityId, canonicalValue };
}
