import { EXTERNAL_RESOLVER_CONFIG } from "@/constants/voice";
import { useVoiceStore } from "@/stores/voice-store";
import type {
  ExternalResolverRequest,
  ExternalResolverResponse,
  ExternalVoiceResolver,
} from "@/types";

export interface ExternalResolverOptions {
  baseUrl?: string;
  endpoint?: string;
  timeoutMs?: number;
}

export class HttpExternalVoiceResolver implements ExternalVoiceResolver {
  private readonly baseUrl: string;
  private readonly endpoint: string;
  private readonly timeoutMs: number;

  constructor(options: ExternalResolverOptions = {}) {
    this.baseUrl = options.baseUrl ?? EXTERNAL_RESOLVER_CONFIG.baseUrl;
    this.endpoint = options.endpoint ?? EXTERNAL_RESOLVER_CONFIG.resolveEndpoint;
    this.timeoutMs = options.timeoutMs ?? EXTERNAL_RESOLVER_CONFIG.timeoutMs;
  }

  async resolve(
    request: ExternalResolverRequest,
  ): Promise<ExternalResolverResponse> {
    const transcript = request.transcript.trim();
    if (!transcript) {
      return { handled: false };
    }

    useVoiceStore.getState().setVoice({
      externalResolving: true,
      externalStatus: "resolving",
      externalError: null,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    if (request.signal) {
      request.signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }

    try {
      const url = `${this.baseUrl.replace(/\/+$/, "")}${this.endpoint}`;
      const payload = {
        transcript,
        context: {
          pathname: request.screenContext.pathname,
          playback: {
            contentId: request.screenContext.playback.current?.id,
            title: request.screenContext.playback.current?.title,
            playing: request.screenContext.playback.playing,
            progress: request.screenContext.playback.progress,
            speed: request.screenContext.playback.speed,
          },
          preferences: {
            town: request.screenContext.preferences.town,
            spokenGuidanceEnabled:
              request.screenContext.preferences.spokenGuidanceEnabled,
          },
          screenReaderEnabled: request.screenContext.screenReaderEnabled,
        },
        appSummary: request.appSummary ?? {
          currentPath: request.screenContext.pathname,
          playingTitle: request.screenContext.playback.current?.title,
          isPlaying: request.screenContext.playback.playing,
        },
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Hear-Client": EXTERNAL_RESOLVER_CONFIG.clientName,
          "X-Hear-Version": EXTERNAL_RESOLVER_CONFIG.clientVersion,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorMsg = `External resolver returned HTTP ${response.status}`;
        useVoiceStore.getState().setVoice({
          externalResolving: false,
          externalStatus: "error",
          externalError: errorMsg,
        });
        return {
          handled: false,
          error: errorMsg,
        };
      }

      const raw = (await response.json()) as unknown;
      const parsed = this.validateResponse(raw);

      useVoiceStore.getState().setVoice({
        externalResolving: false,
        externalStatus: "success",
        lastExternalResponse: parsed,
      });

      return parsed;
    } catch (error) {
      clearTimeout(timeoutId);
      const isAbort =
        error instanceof Error &&
        (error.name === "AbortError" || controller.signal.aborted);
      const errorMsg = isAbort
        ? "External resolver request timed out"
        : error instanceof Error
          ? error.message
          : "Network request failed";

      useVoiceStore.getState().setVoice({
        externalResolving: false,
        externalStatus: "error",
        externalError: errorMsg,
      });

      return {
        handled: false,
        error: errorMsg,
      };
    }
  }

  private validateResponse(data: unknown): ExternalResolverResponse {
    if (!data || typeof data !== "object") {
      return { handled: false };
    }

    const obj = data as Record<string, unknown>;
    const handled = Boolean(obj.handled || obj.success);
    const spokenResponse =
      typeof obj.spokenResponse === "string"
        ? obj.spokenResponse
        : typeof obj.response === "string"
          ? obj.response
          : undefined;
    const displayText =
      typeof obj.displayText === "string"
        ? obj.displayText
        : typeof obj.message === "string"
          ? obj.message
          : undefined;

    const action =
      obj.action && typeof obj.action === "object"
        ? {
            type: String((obj.action as Record<string, unknown>).type || ""),
            payload: (obj.action as Record<string, unknown>).payload as
              | Record<string, unknown>
              | undefined,
          }
        : undefined;

    const confidence =
      typeof obj.confidence === "number" ? obj.confidence : undefined;

    return {
      handled,
      spokenResponse,
      displayText,
      action,
      confidence,
    };
  }
}

export const externalVoiceResolver: ExternalVoiceResolver =
  new HttpExternalVoiceResolver();
