import type { ContentItem, Entity, LibrarySection, Topic } from "./content";
import type { Preferences } from "./preferences";
import type { SpeedMultiplier } from "./playback";

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
  | "account";

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

export type VoiceInvocationSource =
  | "doubleTap"
  | "accessibilityAction"
  | "contextualAction"
  | "onboardingPractice";

export type VoiceStore = {
  state: VoiceState;
  sessionId?: string;
  transcript: string;
  message: string;
  prompt: string;
  choices: VoiceChoice[];
  errorCode?: string;
  retryable: boolean;
  setVoice: (
    change: Partial<Omit<VoiceStore, "setVoice" | "resetVoice">>,
  ) => void;
  resetVoice: () => void;
};

export type PlayMode =
  | "current"
  | "latest"
  | "local"
  | "recommended"
  | "trending"
  | "saved"
  | "downloads"
  | "story";
export type VoiceRisk = "safe" | "state-change" | "privacy" | "destructive";
export type VoiceExecutorKey =
  | "navigate"
  | "close"
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
  | "onboardingUseLocation";

export type VoiceCommand =
  | {
      type: "navigate";
      target: "home" | "discover" | "library" | "settings" | "player";
    }
  | { type: "close" }
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
    }
  | {
      type:
        | "pause"
        | "resume"
        | "next"
        | "previous"
        | "restart"
        | "saveCurrent"
        | "removeSaved"
        | "downloadCurrent"
        | "removeDownload"
        | "whatIsThis"
        | "whoMadeThis"
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
        | "onboardingRead"
        | "onboardingUseSpokenSetup"
        | "onboardingUseScreenControls"
        | "onboardingPlaySoundCheck"
        | "onboardingCannotHear"
        | "onboardingUseLocation"
        | "unknown";
    }
  | { type: "repeat"; mode: "on" | "off" }
  | { type: "seek"; direction: "forward" | "backward"; seconds: number }
  | { type: "speed"; multiplier: SpeedMultiplier }
  | { type: "speedStep"; direction: "up" | "down" }
  | { type: "follow" | "unfollow"; entityId: string }
  | { type: "sleepTimer"; minutes: number }
  | { type: "onboardingSetTown"; locationId: string; name: string };

export type VoiceHypothesis = {
  transcript: string;
  confidence: number;
  rank: number;
};
export type VoiceEvidence = {
  source: "exact" | "fts" | "trigram" | "phonetic" | "learned";
  termId?: number;
  score: number;
  matchedText?: string;
};
export type VoiceSlots = Record<string, string | number | boolean | undefined>;
export type VoiceInvocation = {
  actionId: string;
  executorKey: VoiceExecutorKey;
  command: VoiceCommand;
  slots: VoiceSlots;
  confidence: number;
  evidence: VoiceEvidence[];
  alternatives: { actionId: string; label: string; confidence: number }[];
  recognitionSessionId: string;
  databaseVersion: number;
  risk: VoiceRisk;
  requiresConfirmation: boolean;
  idempotencyKey: string;
};

export type VoiceChoice = {
  id: string;
  label: string;
  detail?: string;
  invocation?: VoiceInvocation;
  alias?: string;
  command: VoiceCommand;
};
export type VoiceResolution =
  | { kind: "invocation"; invocation: VoiceInvocation }
  | {
      kind: "choices";
      prompt: string;
      choices: VoiceChoice[];
      confidence: number;
    }
  | { kind: "unrecognized"; confidence: number; reason?: string }
  | { kind: "cancelled"; confidence: 0 };
export type VoiceResolveContext = {
  currentPath?: string;
  preferences: Preferences;
  stories: ContentItem[];
  topics: Topic[];
  entities: Entity[];
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
export type VoiceContextValue = {
  state: VoiceState;
  sessionId?: string;
  transcript: string;
  message: string;
  prompt: string;
  choices: VoiceChoice[];
  errorCode?: string;
  retryable: boolean;
  startVoiceSession: (options: { source: VoiceInvocationSource }) => Promise<void>;
  stop: () => void;
  retry: () => Promise<void>;
  cancel: () => void;
  close: () => void;
  choose: (choice: VoiceChoice) => Promise<void>;
};
export type VoiceCandidateKind =
  "action" | "story" | "topic" | "entity" | "location";
export type VoiceCandidate = {
  id: number;
  canonical: string;
  normalized: string;
  kind: VoiceCandidateKind;
  targetId: string | null;
  weight: number;
  executorKey?: VoiceExecutorKey | null;
  risk?: VoiceRisk;
  confirmation?: number;
  score?: number;
  source?: VoiceEvidence["source"];
};
export type VoiceActionDefinition = {
  id: string;
  executorKey: VoiceExecutorKey;
  label: string;
  risk: VoiceRisk;
  confirmation: boolean;
  slotSchema: string;
};
