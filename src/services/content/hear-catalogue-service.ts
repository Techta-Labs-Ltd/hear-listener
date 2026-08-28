import { EXTERNAL_VOICE_CONFIG } from "@/constants/external-voice";
import type {
  HearCataloguePage,
  HearSearchFilter,
  HearSearchRequest,
  HearSearchSort,
} from "@/types";
import { joinServiceUrl } from "@/utils/voice/external-resolver";
import { parseHearSearchResponse } from "@/utils/voice/hear-api";
import { toRemoteContentItems } from "@/utils/voice/external-playback";

export type HearCatalogueSearchOptions = {
  query?: string;
  filter?: HearSearchFilter;
  sort?: HearSearchSort;
  isLocal?: boolean;
  isRecommended?: boolean;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
};

export type HearCatalogueClientOptions = {
  baseUrl?: string;
  endpoint?: string;
  apiKey?: string;
};

export class HearCatalogueError extends Error {
  constructor(
    message: string,
    readonly code: "not-configured" | "http" | "invalid-response" | "network",
    readonly status?: number,
  ) {
    super(message);
    this.name = "HearCatalogueError";
  }
}

export class HttpHearCatalogueService {
  private readonly baseUrl: string;
  private readonly endpoint: string;
  private readonly apiKey: string;

  constructor(options: HearCatalogueClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? EXTERNAL_VOICE_CONFIG.searchBaseUrl;
    this.endpoint = options.endpoint ?? EXTERNAL_VOICE_CONFIG.searchEndpoint;
    this.apiKey = options.apiKey ?? EXTERNAL_VOICE_CONFIG.apiKey;
  }

  async search(
    options: HearCatalogueSearchOptions = {},
  ): Promise<HearCataloguePage> {
    if (!this.apiKey) {
      throw new HearCatalogueError(
        "Hear! catalogue search is not configured on this build.",
        "not-configured",
      );
    }

    const limit = Number.isFinite(options.limit)
      ? Math.max(1, Math.min(100, Math.floor(options.limit ?? 20)))
      : EXTERNAL_VOICE_CONFIG.cataloguePageSize;
    const requestedPage = Number.isFinite(options.page)
      ? Math.max(0, Math.floor(options.page ?? 0))
      : 0;
    const request: HearSearchRequest = {
      q: options.query?.trim() ?? "",
      isLocal: options.isLocal ?? false,
      isRecommended: options.isRecommended ?? false,
      page: requestedPage,
      limit,
      ...(options.filter ? { filter: options.filter } : {}),
      ...(options.sort ? { sort: options.sort } : {}),
    };

    let response: Response;
    try {
      response = await fetch(joinServiceUrl(this.baseUrl, this.endpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-api-key": this.apiKey,
          "X-Hear-Client": EXTERNAL_VOICE_CONFIG.clientName,
          "X-Hear-Version": EXTERNAL_VOICE_CONFIG.clientVersion,
        },
        body: JSON.stringify(request),
        signal: options.signal,
      });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      throw new HearCatalogueError(
        "Hear! catalogue search is unavailable. Check your connection and try again.",
        "network",
      );
    }

    if (!response.ok) {
      throw new HearCatalogueError(
        `Hear! catalogue search failed with status ${response.status}.`,
        "http",
        response.status,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new HearCatalogueError(
        "Hear! catalogue returned an unreadable response.",
        "invalid-response",
      );
    }
    const parsed = parseHearSearchResponse(payload, limit);
    if (!parsed) {
      throw new HearCatalogueError(
        "Hear! catalogue returned an invalid response.",
        "invalid-response",
      );
    }
    if (parsed.page !== requestedPage) {
      throw new HearCatalogueError(
        "Hear! catalogue returned an unexpected page.",
        "invalid-response",
      );
    }
    return {
      items: toRemoteContentItems(parsed.tracks),
      page: parsed.page,
      limit: parsed.limit,
      total: parsed.total,
      totalPages: parsed.totalPages,
      remaining: parsed.remaining,
    };
  }
}

export const hearCatalogueService = new HttpHearCatalogueService();

export function searchHearCatalogue(
  options: HearCatalogueSearchOptions = {},
): Promise<HearCataloguePage> {
  return hearCatalogueService.search(options);
}
