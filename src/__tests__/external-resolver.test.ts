import { HttpExternalVoiceResolver } from "@/services/voice/external-resolver";
import { useVoiceStore } from "@/stores/voice-store";
import { initialPreferences } from "@/stores/preferences-store";
import type { ExternalResolverRequest } from "@/types";

describe("HttpExternalVoiceResolver", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    useVoiceStore.getState().resetVoice();
    jest.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const mockRequest: ExternalResolverRequest = {
    transcript: "What is the weather today?",
    screenContext: {
      pathname: "/",
      playback: {
        current: undefined,
        playing: false,
        progress: 0,
        speed: 1,
      },
      preferences: {
        ...initialPreferences,
        town: "London",
        spokenGuidanceEnabled: true,
      },
      screenReaderEnabled: false,
    },
    appSummary: {
      currentPath: "/",
      playingTitle: undefined,
      isPlaying: false,
    },
  };

  it("returns handled: false for empty transcript", async () => {
    const resolver = new HttpExternalVoiceResolver({
      baseUrl: "https://resolver.hear.media",
    });

    const result = await resolver.resolve({
      ...mockRequest,
      transcript: "   ",
    });

    expect(result.handled).toBe(false);
    expect(useVoiceStore.getState().externalStatus).toBe("idle");
  });

  it("sends request to https://resolver.hear.media and updates state on success", async () => {
    const mockResponsePayload = {
      success: true,
      handled: true,
      spokenResponse: "The weather in London is mostly cloudy and 18 degrees.",
      displayText: "London: 18°C, Cloudy",
      confidence: 0.92,
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponsePayload,
    } as unknown as Response);

    const resolver = new HttpExternalVoiceResolver({
      baseUrl: "https://resolver.hear.media",
      endpoint: "/v1/resolve",
    });

    const result = await resolver.resolve(mockRequest);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://resolver.hear.media/v1/resolve",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
      }),
    );

    expect(result.handled).toBe(true);
    expect(result.spokenResponse).toBe(
      "The weather in London is mostly cloudy and 18 degrees.",
    );

    const store = useVoiceStore.getState();
    expect(store.externalResolving).toBe(false);
    expect(store.externalStatus).toBe("success");
    expect(store.lastExternalResponse).toEqual(result);
  });

  it("handles HTTP 500 error gracefully", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    const resolver = new HttpExternalVoiceResolver({
      baseUrl: "https://resolver.hear.media",
    });

    const result = await resolver.resolve(mockRequest);

    expect(result.handled).toBe(false);
    expect(result.error).toContain("HTTP 500");

    const store = useVoiceStore.getState();
    expect(store.externalResolving).toBe(false);
    expect(store.externalStatus).toBe("error");
    expect(store.externalError).toContain("HTTP 500");
  });

  it("handles fetch network failure gracefully", async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));

    const resolver = new HttpExternalVoiceResolver({
      baseUrl: "https://resolver.hear.media",
    });

    const result = await resolver.resolve(mockRequest);

    expect(result.handled).toBe(false);
    expect(result.error).toBe("Network connection failed");

    const store = useVoiceStore.getState();
    expect(store.externalResolving).toBe(false);
    expect(store.externalStatus).toBe("error");
    expect(store.externalError).toBe("Network connection failed");
  });
});
