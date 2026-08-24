import type { VoiceChoice, VoiceInvocation, VoiceInvocationSource } from "./voice";

export type InteractionEvent =
  | {
      type: "VOICE_INVOKE";
      source: VoiceInvocationSource;
    }
  | {
      type: "SELECT_PREVIOUS";
      source: "tilt-left" | "swipe-left" | "button";
    }
  | {
      type: "SELECT_NEXT";
      source: "tilt-right" | "swipe-right" | "button";
    }
  | {
      type: "CONFIRM_SELECTION";
      source: "voice" | "accessibilityAction" | "button";
    }
  | {
      type: "CANCEL";
      source: string;
    };

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
  resolverContext?: Record<string, unknown>;
  activeEntity?: {
    kind: "track" | "publication" | "topic" | "story";
    id: string;
    title?: string;
  };
  voiceEnabled: boolean;
  disabledReason?: string;
};

export type VoiceSessionPhase =
  | { kind: "idle" }
  | { kind: "permission-check"; sessionId: string }
  | { kind: "preparing"; sessionId: string; screenSnapshotId?: string }
  | { kind: "opening-microphone"; sessionId: string }
  | {
      kind: "listening";
      sessionId: string;
      openedAt: number;
      preSpeechDeadlineAt: number;
      speechDetected: boolean;
    }
  | { kind: "finalizing-transcript"; sessionId: string }
  | { kind: "routing"; sessionId: string; route: "local" | "remote" }
  | {
      kind: "ambiguity";
      sessionId: string;
      interactionId: string;
      selectedIndex: number;
    }
  | { kind: "confirming"; sessionId: string; interactionId: string }
  | { kind: "executing"; sessionId: string; requestId: string }
  | { kind: "speaking-result"; sessionId: string; requestId?: string }
  | { kind: "error"; sessionId?: string; code: string; retryable: boolean }
  | { kind: "cancelled"; sessionId?: string };

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
