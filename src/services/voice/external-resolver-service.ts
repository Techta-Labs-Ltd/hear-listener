import {
  EXTERNAL_INTERACTION_TTL_MS,
  EXTERNAL_VOICE_CONFIG,
} from "@/constants/external-voice";
import type {
  ExternalApiResult,
  ExternalResolverContinueRequest,
  ExternalResolverOptions,
  ExternalResolverRequest,
  ExternalResolverResponse,
  ExternalServiceName,
  ExternalVoiceResolver,
  HearSearchRequest,
  StoredExternalInteraction,
} from "@/types";
import {
  buildAmbiguityPrompt,
  buildAmbiguityChoices,
  buildConfirmationPrompt,
  buildHearSearchRequest,
  buildSearchConfirmationLabel,
  findAmbiguityCandidate,
  parseHearResolverResult,
  parseHearSearchResponse,
} from "@/utils/voice/hear-api";
import {
  externalHttpError,
  externalInteractionExpiryIso,
  joinServiceUrl,
  malformedExternalResponse,
} from "@/utils/voice/external-resolver";

export class HttpExternalVoiceResolver implements ExternalVoiceResolver {
  private readonly resolverBaseUrl: string;
  private readonly resolverEndpoint: string;
  private readonly searchBaseUrl: string;
  private readonly searchEndpoint: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly interactions = new Map<string, StoredExternalInteraction>();
  private interactionSequence = 0;

  constructor(options: ExternalResolverOptions = {}) {
    this.resolverBaseUrl =
      options.resolverBaseUrl ?? EXTERNAL_VOICE_CONFIG.resolverBaseUrl;
    this.resolverEndpoint =
      options.resolverEndpoint ?? EXTERNAL_VOICE_CONFIG.resolverEndpoint;
    this.searchBaseUrl =
      options.searchBaseUrl ?? EXTERNAL_VOICE_CONFIG.searchBaseUrl;
    this.searchEndpoint =
      options.searchEndpoint ?? EXTERNAL_VOICE_CONFIG.searchEndpoint;
    this.apiKey = options.apiKey ?? EXTERNAL_VOICE_CONFIG.apiKey;
    this.timeoutMs = options.timeoutMs ?? EXTERNAL_VOICE_CONFIG.timeoutMs;
  }

  async resolve(
    request: ExternalResolverRequest,
  ): Promise<ExternalResolverResponse> {
    const utterance = request.preparedTranscript.trim();
    if (!utterance) {
      return {
        kind: "unresolved",
        prompt: "I did not hear enough to search for.",
      };
    }

    const response = await this.postJson(
      joinServiceUrl(this.resolverBaseUrl, this.resolverEndpoint),
      {
        utterance,
        timezone: request.timezone,
        country_code: request.country,
      },
      request.signal,
      "resolver",
    );
    if (!response.ok) return response.error;

    const result = parseHearResolverResult(response.value);
    if (!result) return malformedExternalResponse("resolver");
    this.removeExpiredInteractions();

    if (result.ambiguities.some((ambiguity) => ambiguity.candidates.length)) {
      const choices = buildAmbiguityChoices(result);
      if (choices.length === 0) {
        return {
          kind: "clarification",
          prompt: "I found several matches, but I need the full name you want.",
        };
      }
      const interactionToken = this.storeInteraction(request, {
        kind: "ambiguity",
        resolverResult: result,
      });
      return {
        kind: "ambiguity",
        interactionToken,
        prompt: buildAmbiguityPrompt(result, choices),
        choices,
        expiresAt: externalInteractionExpiryIso(),
      };
    }

    if (result.status !== "resolved") {
      return {
        kind: result.status === "ambiguous" ? "clarification" : "unresolved",
        prompt:
          result.status === "ambiguous"
            ? "I found more than one possible match. Please say the full name."
            : "I could not match that request. Please try another name or topic.",
      };
    }

    const searchRequest = buildHearSearchRequest(result);
    const label = buildSearchConfirmationLabel(result);
    const interactionToken = this.storeInteraction(request, {
      kind: "confirmation",
      resolverResult: result,
      searchRequest,
    });
    return {
      kind: "confirmation",
      interactionToken,
      confirmationLabel: label,
      prompt: buildConfirmationPrompt(label),
      expiresAt: externalInteractionExpiryIso(),
    };
  }

  async continue(
    request: ExternalResolverContinueRequest,
  ): Promise<ExternalResolverResponse> {
    this.removeExpiredInteractions();
    const interaction = this.interactions.get(request.interactionToken);
    if (
      !interaction ||
      interaction.voiceSessionId !== request.voiceSessionId ||
      interaction.installationId !== request.installationId
    ) {
      return {
        kind: "error",
        code: "interaction-expired",
        message: "That voice choice has expired. Please make the request again.",
        retryable: false,
      };
    }

    if (request.action.kind === "select") {
      if (interaction.kind !== "ambiguity") {
        return malformedExternalResponse("resolver");
      }
      const selected = findAmbiguityCandidate(
        interaction.resolverResult,
        request.action.candidateId,
      );
      if (!selected) {
        return {
          kind: "clarification",
          prompt: "That did not match the available choices. Please choose one of the names shown.",
        };
      }
      this.interactions.delete(request.interactionToken);
      const searchRequest = buildHearSearchRequest(
        interaction.resolverResult,
        selected,
      );
      const label = buildSearchConfirmationLabel(
        interaction.resolverResult,
        selected,
      );
      const interactionToken = this.storeInteraction(request, {
        kind: "confirmation",
        resolverResult: interaction.resolverResult,
        searchRequest,
      });
      return {
        kind: "confirmation",
        interactionToken,
        confirmationLabel: label,
        prompt: buildConfirmationPrompt(
          selected.canonicalValue,
          "ambiguity-selection",
        ),
        expiresAt: externalInteractionExpiryIso(),
      };
    }

    if (interaction.kind !== "confirmation" || !interaction.searchRequest) {
      return malformedExternalResponse("resolver");
    }

    // Consume before the request so repeated callbacks can never search twice.
    this.interactions.delete(request.interactionToken);
    const response = await this.postJson(
      joinServiceUrl(this.searchBaseUrl, this.searchEndpoint),
      interaction.searchRequest,
      request.signal,
      "search",
    );
    if (!response.ok) return response.error;
    const searchResult = parseHearSearchResponse(
      response.value,
      interaction.searchRequest.limit,
    );
    if (!searchResult) return malformedExternalResponse("search");
    if (searchResult.tracks.length === 0) {
      return {
        kind: "unresolved",
        prompt: "I could not find any playable Hear! audio for that request.",
      };
    }
    return {
      kind: "playback",
      tracks: searchResult.tracks,
      page: searchResult.page,
      limit: searchResult.limit,
      total: searchResult.total,
      totalPages: searchResult.totalPages,
      remaining: searchResult.remaining,
    };
  }

  private storeInteraction(
    request: Pick<
      ExternalResolverRequest | ExternalResolverContinueRequest,
      "voiceSessionId" | "installationId" | "requestId"
    >,
    value: Omit<
      StoredExternalInteraction,
      "voiceSessionId" | "installationId" | "expiresAt"
    >,
  ): string {
    this.interactionSequence += 1;
    const token = `${request.requestId}:${this.interactionSequence}`;
    this.interactions.set(token, {
      ...value,
      voiceSessionId: request.voiceSessionId,
      installationId: request.installationId,
      expiresAt: Date.now() + EXTERNAL_INTERACTION_TTL_MS,
    });
    return token;
  }

  private removeExpiredInteractions(now = Date.now()): void {
    for (const [token, interaction] of this.interactions) {
      if (interaction.expiresAt <= now) this.interactions.delete(token);
    }
  }

  private async postJson(
    url: string,
    body: Record<string, unknown> | HearSearchRequest,
    callerSignal: AbortSignal | undefined,
    service: ExternalServiceName,
  ): Promise<ExternalApiResult> {
    if (!this.apiKey) {
      return {
        ok: false,
        error: {
          kind: "error",
          code: "missing-api-key",
          message: "Hear! voice search has not been configured on this build.",
          retryable: false,
        },
      };
    }

    const controller = new AbortController();
    let timedOut = false;
    const abortFromCaller = () => controller.abort();
    callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-api-key": this.apiKey,
          "X-Hear-Client": EXTERNAL_VOICE_CONFIG.clientName,
          "X-Hear-Version": EXTERNAL_VOICE_CONFIG.clientVersion,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        return {
          ok: false,
          error: externalHttpError(response.status, service),
        };
      }
      try {
        return { ok: true, value: await response.json() };
      } catch {
        return { ok: false, error: malformedExternalResponse(service) };
      }
    } catch {
      if (callerSignal?.aborted) {
        return {
          ok: false,
          error: {
            kind: "error",
            code: "request-cancelled",
            message: "The voice request was cancelled.",
            retryable: false,
          },
        };
      }
      if (timedOut) {
        return {
          ok: false,
          error: {
            kind: "error",
            code: "timeout",
            message: "Hear! search took too long. Please try again.",
            retryable: true,
          },
        };
      }
      return {
        ok: false,
        error: {
          kind: "error",
          code: "offline",
          message:
            "Hear! search is unavailable. Check your internet connection and try again.",
          retryable: true,
        },
      };
    } finally {
      clearTimeout(timeoutId);
      callerSignal?.removeEventListener("abort", abortFromCaller);
    }
  }
}

export const externalVoiceResolver: ExternalVoiceResolver =
  new HttpExternalVoiceResolver();
