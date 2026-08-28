import type { VoiceChoice, VoiceInvocation } from "./voice";

export type InteractionReceipt = {
  requestId: string;
  sessionId: string;
  idempotencyKey: string;
  origin: {
    screenId: string;
    instanceId: string;
    stateVersion: number;
    routeKey: string;
  };
  actionId: string;
  status: "completed" | "failed" | "cancelled";
  startedAt: number;
  completedAt: number;
  retryOf?: string;
  navigation?: {
    from: string;
    to: string;
    returnRoute?: string;
  };
  resultEntityId?: string;
};

export type ScreenVoicePhase =
  | "loading"
  | "ready"
  | "empty"
  | "error"
  | "modal";

export type ScreenVoiceCapability = {
  screenId: string;
  routeKey: string;
  instanceId: string;
  stateVersion: number;
  phase: ScreenVoicePhase;
  title: string;
  readout: () => string;
  localCommands: string[];
  remoteCapabilities: string[];
  recognitionExpectation?: "natural-command" | "entity-search" | "short-response";
  resolverContext?: Record<string, unknown>;
  activeEntity?: {
    kind: "track" | "publication" | "topic" | "story";
    id: string;
    title?: string;
  };
  voiceEnabled: boolean;
  disabledReason?: string;
};

export type PendingAmbiguity = {
  interactionId: string;
  sessionId: string;
  requestId: string;
  alternatives: {
    id: string;
    label: string;
    invocation?: VoiceInvocation;
    confidence?: number;
    choice?: VoiceChoice;
    entityId?: string;
    entityType?: "organization" | "publication" | "creator" | "category" | "tag" | "location" | "story";
    canonicalName?: string;
    score?: number;
  }[];
  selectedIndex: number;
  createdAt: number;
  expiresAt: number;
};

export type AmbiguitySelection = {
  id: string;
  label: string;
  choice?: VoiceChoice;
  invocation?: VoiceInvocation;
};

export type AmbiguityStore = {
  pending?: PendingAmbiguity;
  setAmbiguity: (
    sessionId: string,
    requestId: string,
    choices: VoiceChoice[],
    invocations?: VoiceInvocation[],
    now?: number,
  ) => PendingAmbiguity;
  getPending: (now?: number) => PendingAmbiguity | undefined;
  moveSelection: (direction: 1 | -1) => PendingAmbiguity | undefined;
  selectIndex: (index: number) => AmbiguitySelection | undefined;
  confirmSelection: () => AmbiguitySelection | undefined;
  selectByTranscript: (transcript: string) => AmbiguitySelection | undefined;
  clearAmbiguity: () => void;
};

export type FeedbackTarget =
  | {
      kind: "track";
      trackId: string;
      publicationId?: string;
      playbackSessionId: string;
      resumePlaybackOnClose?: boolean;
    }
  | {
      kind: "publication";
      publicationId: string;
      playbackSessionId: string;
      listenedTrackIds: string[];
      resumePlaybackOnClose?: boolean;
    };

export type FeedbackVoiceStore = {
  activeTarget?: FeedbackTarget;
  pendingRating?: number;
  startFeedback: (target: FeedbackTarget) => void;
  setRating: (rating: number) => void;
  clearFeedback: () => void;
};
