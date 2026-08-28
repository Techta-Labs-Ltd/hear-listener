import type { EntityType } from "./voice-entities";
import type { VoiceChoice } from "./voice";

export type ExternalResolverStatus =
  | "idle"
  | "resolving"
  | "success"
  | "error";

export type ExternalServiceName = "resolver" | "search";
export type ExternalConfirmationPromptKind =
  | "search"
  | "ambiguity-selection";

export type ExternalResolverRequest = {
  originalTranscript: string;
  preparedTranscript: string;
  locale: "en-GB";
  timezone: "Europe/London";
  country: "gb";
  voiceSessionId: string;
  requestId: string;
  installationId: string;
  firebaseIdToken?: string;
  signal?: AbortSignal;
};

export type ExternalResolverChoice = {
  id: string;
  label: string;
  detail?: string;
  entityType?: EntityType;
};

export type HearResolverEntity = {
  entityType: EntityType;
  entityId?: string;
  canonicalValue: string;
  originalText: string;
  confidence: number;
  method: string;
  start: number;
  end: number;
  latitude?: number;
  longitude?: number;
  countryCode?: string;
  locationRole?: string;
};

export type HearAmbiguityCandidate = {
  entityType: EntityType;
  entityId?: string;
  canonicalValue: string;
};

export type HearResolverAmbiguity = {
  phrase: string;
  candidates: HearAmbiguityCandidate[];
};

export type HearResolverSlots = {
  residualQuery: string;
  latest: boolean;
  isRecommended: boolean;
  isPublication: boolean;
  sort: string;
  publishedFrom?: number;
  publishedTo?: number;
};

export type HearResolverResult = {
  status: string;
  intent: string;
  entities: HearResolverEntity[];
  slots: HearResolverSlots;
  ambiguities: HearResolverAmbiguity[];
  timingMs: number;
};

export type HearSearchSort =
  | "recommended"
  | "nearest"
  | "popular"
  | "latest"
  | "trending";

export type HearSearchFilter = {
  categorySlugs?: string[];
  tags?: string[];
  creatorIds?: string[];
  organizationIds?: string[];
  publicationIds?: string[];
  isPublication?: boolean;
  contentIds?: string[];
  publishedFrom?: number;
  publishedTo?: number;
  city?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
};

export type HearSearchRequest = {
  q: string;
  filter?: HearSearchFilter;
  sort?: HearSearchSort;
  isLocal: boolean;
  isRecommended: boolean;
  page: number;
  limit: number;
};

export type ExternalPlaybackSpeedSource = {
  speed: number;
  url: string;
};

export type ExternalPlaybackTrack = {
  contentId: string;
  audioUrl: string;
  title: string;
  spokenTitle: string;
  shortDescription?: string;
  creator?: { id?: string; name: string };
  organization?: { id?: string; name: string };
  category?: { slug?: string; name: string };
  tags?: string[];
  publication?: { id?: string; title: string };
  publicationTrackIndex?: number;
  publicationTrackCount?: number;
  durationSeconds?: number;
  publishedAt?: string;
  playbackSpeedUrls?: ExternalPlaybackSpeedSource[];
};

export type ExternalResolverResponse =
  | {
      kind: "ambiguity";
      interactionToken: string;
      prompt: string;
      choices: ExternalResolverChoice[];
      expiresAt?: string;
    }
  | {
      kind: "confirmation";
      interactionToken: string;
      confirmationLabel: string;
      prompt: string;
      expiresAt?: string;
    }
  | { kind: "clarification"; prompt: string }
  | { kind: "unresolved"; prompt: string }
  | {
      kind: "playback";
      tracks: ExternalPlaybackTrack[];
      announcement?: string;
      total?: number;
    }
  | ExternalResolverErrorResponse;

export type ExternalResolverErrorResponse = {
  kind: "error";
  code: string;
  message: string;
  retryable: boolean;
};

export type ExternalResolverContinueRequest = {
  interactionToken: string;
  voiceSessionId: string;
  requestId: string;
  installationId: string;
  action:
    | { kind: "select"; candidateId: string }
    | { kind: "confirm"; approved: true };
  firebaseIdToken?: string;
  signal?: AbortSignal;
};

export interface ExternalVoiceResolver {
  resolve(request: ExternalResolverRequest): Promise<ExternalResolverResponse>;
  continue(
    request: ExternalResolverContinueRequest,
  ): Promise<ExternalResolverResponse>;
}

export type PendingExternalInteraction = {
  phase: "ambiguity" | "confirmation";
  interactionToken: string;
  voiceSessionId: string;
  installationId: string;
  prompt: string;
  choices: VoiceChoice[];
  expiresAt: number;
  invalidAttempts: number;
  resumePlaybackOnCancel: boolean;
};

export type ExternalInteractionContext = {
  voiceSessionId: string;
  installationId: string;
  resumePlaybackOnCancel?: boolean;
};

export type ExternalPendingDecision =
  | { kind: "select"; candidateId: string }
  | { kind: "confirm" }
  | { kind: "cancel" }
  | { kind: "repeat"; prompt: string; choices: VoiceChoice[] }
  | { kind: "invalid"; prompt: string; choices: VoiceChoice[] };

export type ExternalInteractionTransition = {
  decision: ExternalPendingDecision;
  pending?: PendingExternalInteraction;
};

export type ExternalVoiceStore = {
  status: ExternalResolverStatus;
  error: string | null;
  lastResponse: ExternalResolverResponse | null;
  pending?: PendingExternalInteraction;
  beginRequest: () => void;
  receiveResponse: (
    response: ExternalResolverResponse,
    context: ExternalInteractionContext,
    now?: number,
  ) => PendingExternalInteraction | undefined;
  cancelRequest: () => void;
  getPending: (now?: number) => PendingExternalInteraction | undefined;
  interpretPending: (
    transcript: string,
    now?: number,
  ) => ExternalPendingDecision | undefined;
  clearPending: () => void;
  resetExternalVoice: () => void;
};

export interface ExternalResolverOptions {
  resolverBaseUrl?: string;
  resolverEndpoint?: string;
  searchBaseUrl?: string;
  searchEndpoint?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export type StoredExternalInteraction = {
  kind: "ambiguity" | "confirmation";
  voiceSessionId: string;
  installationId: string;
  expiresAt: number;
  resolverResult: HearResolverResult;
  searchRequest?: HearSearchRequest;
};

export type ExternalApiResult =
  | { ok: true; value: unknown }
  | { ok: false; error: ExternalResolverErrorResponse };

export type ExternalTranscriptCorrection = {
  original: string;
  canonical: string;
  entityType: EntityType;
};

export type ExternalTranscriptPreparation = {
  originalTranscript: string;
  preparedTranscript: string;
  corrections: ExternalTranscriptCorrection[];
};

export type InstallationIdStorage = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
};
