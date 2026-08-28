import type { LibrarySection } from "./content";
import type { Preferences } from "./preferences";
import type {
  PlaybackQueueMode,
  PlaybackSnapshot,
  SpeedMultiplier,
} from "./playback";
import type { ScreenVoicePhase } from "./interaction";

export type VoiceState =
  | "idle"
  | "permission"
  | "preparing"
  | "listening"
  | "resolving"
  | "clarifying"
  | "executing"
  | "success"
  | "error"
  | "cancelled";

export type VoiceScreenId =
  | "home"
  | "discover"
  | "library"
  | "librarySection"
  | "player"
  | "settings"
  | "topic"
  | "onboarding"
  | "account"
  | "sleepTimer"
  | "queue"
  | "search"
  | "unknown";

export type VoiceCommandExample = {
  phrase: string;
  description: string;
};

export type VoiceScreenDefinition<Context = unknown> = {
  id: VoiceScreenId;
  title: string;
  matches: (pathname: string) => boolean;
  orientation: (context: Context) => string;
  readout: (context: Context) => string;
  commands: readonly VoiceCommandExample[];
};

export type SpeechPriority = "screen" | "instruction" | "session";

export type SpeechRequest = {
  key: string;
  text: string;
  priority?: SpeechPriority;
  force?: boolean;
};

export type VoiceScreenContext = {
  pathname: string;
  playback: Pick<PlaybackSnapshot, "current" | "playing" | "progress" | "speed">;
  preferences: Preferences;
  screenReaderEnabled?: boolean;
};

export type VoiceInvocationSource =
  | "shakeGesture"
  | "accessibilityAction"
  | "contextualAction"
  | "onboardingPractice"
  | "eventTrigger";

export type VoiceTriggerEvent = {
  source?: VoiceInvocationSource;
  announceLocation?: boolean;
};

export type VoiceEventListener = (event: VoiceTriggerEvent) => void;

export type ActiveVoiceSession = {
  id: string;
  controller: AbortController;
  finalHandled: boolean;
  asrConfirmed: boolean;
  startedAt: number;
  deadlineAt?: number;
  speechDetected: boolean;
  playbackWasPlaying: boolean;
  source?: VoiceInvocationSource;
  screenSnapshot?: ScreenVoiceContext | null;
};

export type VoiceStore = {
  state: VoiceState;
  isVoiceActive: boolean;
  isDockVisible: boolean;
  sessionId?: string;
  transcript: string;
  originalTranscript?: string;
  preparedTranscript?: string;
  message: string;
  prompt: string;
  choices: VoiceChoice[];
  errorCode?: string;
  retryable: boolean;
  listeningStartedAt?: number;
  listeningDeadlineAt?: number;
  speechDetected?: boolean;
  activeScreenId?: string | null;
  activeScreenTitle?: string | null;
  setVoice: (
    change: Partial<Omit<VoiceStore, "setVoice" | "resetVoice">>,
  ) => void;
  resetVoice: () => void;
};

export type SpeechStore = {
  isSpeaking: boolean;
  currentUtterance: string | null;
  speechState: "idle" | "speaking" | "paused";
  setSpeaking: (isSpeaking: boolean, currentUtterance?: string | null) => void;
  setSpeechState: (state: "idle" | "speaking" | "paused") => void;
  resetSpeech: () => void;
};

export type PlayMode =
  | "current"
  | "latest"
  | "local"
  | "recommended"
  | "trending"
  | "saved"
  | "downloads"
  | "story"
  | "entity";
export type VoiceRisk = "safe" | "state-change" | "privacy" | "destructive";
export type VoiceExecutorKey =
  | "navigate"
  | "close"
  | "cancel"
  | "openLibrarySection"
  | "openTopic"
  | "setLocation"
  | "search"
  | "play"
  | "pause"
  | "resume"
  | "next"
  | "previous"
  | "restart"
  | "repeat"
  | "seek"
  | "speed"
  | "speedStep"
  | "saveCurrent"
  | "removeSaved"
  | "downloadCurrent"
  | "removeDownload"
  | "follow"
  | "unfollow"
  | "whatIsThis"
  | "whoMadeThis"
  | "sleepTimer"
  | "cancelSleepTimer"
  | "addToQueue"
  | "openQueue"
  | "clearQueue"
  | "changeLocation"
  | "help"
  | "openAppSettings"
  | "openAudioSettings"
  | "openBluetoothSettings"
  | "openInternetSettings"
  | "openWifiSettings"
  | "openAccessibilitySettings"
  | "openLocationSettings"
  | "resetVoiceCorrections"
  | "readScreen"
  | "accountSignIn"
  | "accountSignOut"
  | "onboardingContinue"
  | "onboardingBack"
  | "onboardingSkip"
  | "onboardingSetTown"
  | "onboardingRead"
  | "onboardingUseSpokenSetup"
  | "onboardingUseScreenControls"
  | "onboardingPlaySoundCheck"
  | "onboardingCannotHear"
  | "onboardingUseLocation"
  | "unknown";

export type VoiceCommand =
  | {
      type: "navigate";
      target: "home" | "discover" | "library" | "settings" | "player";
    }
  | { type: "close" }
  | { type: "cancel" }
  | { type: "openLibrarySection"; section: LibrarySection }
  | { type: "openTopic"; topicId: string }
  | { type: "setLocation"; locationId: string; name: string }
  | { type: "search"; query: string }
  | {
      type: "play";
      mode: PlayMode;
      storyId?: string;
      topicId?: string;
      locationId?: string;
      entityId?: string;
      entityType?: "organization" | "publication" | "creator" | "category";
      entityName?: string;
    }
  | { type: "pause" | "resume" | "next" | "previous" | "restart" }
  | { type: "repeat"; mode: "on" | "off" }
  | { type: "seek"; seconds: number; direction?: "forward" | "backward" }
  | { type: "speed"; multiplier: SpeedMultiplier }
  | { type: "speedStep"; direction: "up" | "down" }
  | { type: "follow" | "unfollow"; entityId: string }
  | { type: "saveCurrent" }
  | { type: "removeSaved"; storyId?: string }
  | { type: "downloadCurrent" }
  | { type: "removeDownload"; storyId?: string }
  | { type: "whatIsThis" | "whoMadeThis" }
  | { type: "sleepTimer"; minutes: number }
  | { type: "cancelSleepTimer" }
  | { type: "addToQueue"; storyId?: string }
  | { type: "openQueue" }
  | { type: "clearQueue" }
  | { type: "changeLocation" }
  | { type: "help" }
  | { type: "openAppSettings" }
  | { type: "openAudioSettings" }
  | { type: "openBluetoothSettings" }
  | { type: "openInternetSettings" }
  | { type: "openWifiSettings" }
  | { type: "openAccessibilitySettings" }
  | { type: "openLocationSettings" }
  | { type: "resetVoiceCorrections" }
  | { type: "readScreen" }
  | { type: "accountSignIn" }
  | { type: "accountSignOut" }
  | { type: "onboardingContinue" }
  | { type: "onboardingBack" }
  | { type: "onboardingSkip" }
  | { type: "onboardingSetTown"; locationId: string; name: string }
  | { type: "onboardingRead" }
  | { type: "onboardingUseSpokenSetup" }
  | { type: "onboardingUseScreenControls" }
  | { type: "onboardingPlaySoundCheck" }
  | { type: "onboardingCannotHear" }
  | { type: "onboardingUseLocation" };

export type VoiceHypothesis = {
  transcript: string;
  confidence: number;
  rank: number;
};
export type VoiceEvidence = {
  source: "exact" | "fts" | "trigram" | "phonetic" | "learned" | "phrase" | "alias" | "entity" | "generic" | "prefix";
  termId?: number;
  score: number;
  matchedText?: string;
};
export type VoiceSlots = Record<string, string | number | boolean | undefined>;
export type VoiceInvocation = {
  actionId: string;
  executorKey: VoiceExecutorKey;
  command: VoiceCommand;
  label?: string;
  transcript?: string;
  slots: VoiceSlots;
  confidence: number;
  evidence: VoiceEvidence[];
  alternatives: { actionId: string; label: string; confidence: number }[];
  recognitionSessionId: string;
  databaseVersion: number;
  risk: VoiceRisk;
  requiresConfirmation: boolean;
  idempotencyKey: string;
  feedbackSpeech?: string;
};

export type VoiceChoice = {
  id: string;
  label: string;
  detail?: string;
  invocation?: VoiceInvocation;
  alias?: string;
  command?: VoiceCommand;
  externalCandidateId?: string;
  externalAction?:
    | { kind: "select"; candidateId: string }
    | { kind: "confirm"; approved: boolean };
};
export type VoiceResolution =
  | { kind: "invocation"; invocation: VoiceInvocation }
  | {
      kind: "choices";
      prompt: string;
      choices: VoiceChoice[];
      confidence: number;
      recognitionSessionId?: string;
    }
  | { kind: "unrecognized"; confidence: number; reason?: string }
  | { kind: "cancelled"; confidence: 0 }
  | { kind: "none"; reason: string };
export type VoiceResolveContext = {
  screenId?: string;
  currentPath?: string;
  pathname?: string;
  screenState?:
    | string
    | {
        phase?: ScreenVoicePhase;
        stateVersion?: number;
        instanceId?: string;
      };
  activeContent?: {
    id: string;
    type: string;
    title: string;
  };
  playback?: {
    playing: boolean;
    contentId?: string;
    title?: string;
  };
  preferences: Preferences;
};
export type VoiceResolveRequest = {
  sessionId: string;
  hypotheses: VoiceHypothesis[];
  context: VoiceResolveContext;
  signal?: AbortSignal;
};
export interface VoiceResolver {
  resolve(request: VoiceResolveRequest): Promise<VoiceResolution>;
}
export type ScreenVoiceContext = {
  id?: VoiceScreenId;
  pathname?: string;
  title?: string;
  orientation?: string;
  readout?: string | (() => string);
  commands?: string[];
  screenState?:
    | string
    | {
        phase?: ScreenVoicePhase;
        stateVersion?: number;
        instanceId?: string;
      };
  voiceEnabled?: boolean;
  recognitionExpectation?: "natural-command" | "entity-search" | "short-response";
  resolverContext?: Record<string, unknown>;
  localCommands?: string[];
};

export type VoiceContextValue = {
  state: VoiceState;
  sessionId?: string;
  transcript: string;
  message: string;
  prompt: string;
  choices: VoiceChoice[];
  errorCode?: string;
  retryable: boolean;
  listeningStartedAt?: number;
  listeningDeadlineAt?: number;
  speechDetected?: boolean;
  activeScreen?: ScreenVoiceContext | null;
  registerScreen?: (screen: ScreenVoiceContext) => () => void;
  startVoiceSession: (options?: {
    source?: VoiceInvocationSource;
    announceLocation?: boolean;
  }) => Promise<void>;
  stop: () => void;
  retry: () => Promise<void>;
  cancel: () => void;
  close: () => void;
  dismiss: () => void;
  choose: (choice: VoiceChoice) => Promise<void>;
};

export type VoiceFailureOptions = {
  announce?: boolean;
  includeRetryGuidance?: boolean;
  retryable?: boolean;
};

export type PanelPhase = "initializing" | "listening" | "working";

export type ListeningCountdownProps = {
  durationMs?: number;
  deadlineAt?: number;
  speechDetected?: boolean;
  onExpired?: () => void;
  size?: number;
  strokeWidth?: number;
};

export type ListeningPanelProps = {
  state: VoiceState;
  message?: string;
  prompt?: string;
  transcript?: string;
  deadlineAt?: number;
  speechDetected?: boolean;
};

export type VoiceStatusBadgeProps = {
  label: string;
  className?: string;
};

export type MicrophonePermissionStatus = {
  granted: boolean;
  status: "granted" | "denied" | "undetermined" | "blocked";
  canAskAgain?: boolean;
};

export type VoiceAudioGate = {
  enterQuietMode(): Promise<void>;
  exitQuietMode(): void;
  isQuiet(): boolean;
};

export interface ListeningTimerResult {
  remainingMs: number;
  remainingSeconds: number;
  progressRatio: number;
  fillPercent: number;
}

export type LocalRoutingResult =
  | { kind: "execute"; invocation: VoiceInvocation }
  | { kind: "ambiguity"; prompt: string; choices: VoiceChoice[] }
  | {
      kind: "remote";
      originalTranscript: string;
      preparedTranscript: string;
    }
  | { kind: "cancelled" }
  | { kind: "selected" }
  | {
      kind: "feedback";
      prompt: string;
      reopenListening?: boolean;
      resumePlaybackOnClose?: boolean;
    }
  | { kind: "unrecognised"; reason: string };

export type PendingRouterContext = {
  playback?: {
    current?: {
      id: string;
      title?: string;
      publicationId?: string;
    } | null;
    playing?: boolean;
    queueMode?: PlaybackQueueMode;
    queue?: { id: string }[];
    playbackSessionId?: string;
  };
  playbackWasPlaying?: boolean;
  state?: string;
};
