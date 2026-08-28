import {
  HearCatalogueError,
  HttpHearCatalogueService,
} from "@/services/content/hear-catalogue-service";

const liveSearchFixture = {
  results: [
    {
      contentId: "0932f8c3-9cc5-486b-bdc3-63345003ff02",
      title: "11_Pastoral_Letter",
      shortDescription:
        "A call to action for young people to shape the future of the Church of England.",
      creator: {
        id: "15d4244f-a2ee-4c80-8a03-09c937149c0c",
        name: "Lichfield Diocesan Digest previous articles",
      },
      organization: {
        id: "eabd9902-98fe-48e1-ad51-1fbfc5d62362",
        name: "Lichfield Diocesan Digest previous articles",
      },
      category: { slug: "community-church", name: "Community Church" },
      tags: ["church", "bible-study"],
      audioUrl:
        "https://cdn.hear.media/localtns/lichprev/audio/track.mp3",
      durationSecs: 0,
      playbackSpeed: [
        {
          speed: 1.5,
          audioUrl:
            "https://cdn.hear.media/localtns/lichprev/audio/track-x1-5.mp3",
        },
      ],
      publishedAt: 1785555458,
    },
  ],
  page: 0,
  limit: 20,
  total: 1,
  totalPages: 1,
  remaining: 0,
  isLocal: false,
  isRecommended: false,
};

describe("Hear catalogue service", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("maps a real Alexa search response into playable Now Playing content", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(jsonResponse(liveSearchFixture));
    const service = new HttpHearCatalogueService({ apiKey: "test-key" });

    const page = await service.search({
      query: "bible study",
      limit: 20,
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://alexa.hear.media/api/v1/alexa/search",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-api-key": "test-key" }),
      }),
    );
    const request = (globalThis.fetch as jest.Mock).mock.calls[0][1];
    expect(JSON.parse(request.body)).toEqual({
      q: "bible study",
      isLocal: false,
      isRecommended: false,
      page: 0,
      limit: 20,
    });
    expect(page).toMatchObject({
      page: 0,
      limit: 20,
      total: 1,
      totalPages: 1,
      remaining: 0,
      items: [
        {
          id: "0932f8c3-9cc5-486b-bdc3-63345003ff02",
          title:
            "A call to action for young people to shape the future of the Church of England.",
          creator: "Lichfield Diocesan Digest previous articles",
          publication: "Lichfield Diocesan Digest previous articles",
          category: "Community Church",
          categoryId: "community-church",
          origin: "hear-search",
          audioUrl:
            "https://cdn.hear.media/localtns/lichprev/audio/track.mp3",
          duration: "Audio",
          publishedAt: "2026-08-01T03:37:38.000Z",
          playbackSpeedUrls: [
            {
              speed: 1.5,
              url: "https://cdn.hear.media/localtns/lichprev/audio/track-x1-5.mp3",
            },
          ],
        },
      ],
    });
  });

  it("rejects missing credentials and malformed response bodies", async () => {
    await expect(new HttpHearCatalogueService({ apiKey: "" }).search()).rejects.toMatchObject({
      code: "not-configured",
    });

    globalThis.fetch = jest.fn().mockResolvedValue(jsonResponse({ nope: true }));
    await expect(
      new HttpHearCatalogueService({ apiKey: "test-key" }).search(),
    ).rejects.toBeInstanceOf(HearCatalogueError);

    globalThis.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ ...liveSearchFixture, page: 1, limit: 0 }),
    );
    await expect(
      new HttpHearCatalogueService({ apiKey: "test-key" }).search({ page: 1 }),
    ).rejects.toMatchObject({ code: "invalid-response" });
  });
});

function jsonResponse(value: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => value,
  } as Response;
}
