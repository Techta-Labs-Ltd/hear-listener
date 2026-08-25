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

export type FeedbackTarget =
  | {
      kind: "track";
      trackId: string;
      publicationId?: string;
      playbackSessionId: string;
    }
  | {
      kind: "publication";
      publicationId: string;
      playbackSessionId: string;
      listenedTrackIds: string[];
    };
