import type { Href } from "expo-router";
import type { ContentItem, Entity, Topic } from "./content";
import type { Preferences } from "./preferences";
import type { SpeedMultiplier } from "./playback";
import type { PlayMode, VoiceInvocation } from "./voice";
import type { RecognitionPurpose } from "./voice-speech";

export type VoiceNavigationServices = {
  replace: (href: Href) => void;
  push: (href: Href) => void;
  back: () => void;
  setDiscoverTopic: (topicId: string) => void;
};

export type VoicePlaybackServices = {
  current?: ContentItem;
  play: (item?: ContentItem) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  previous: () => void;
  restart: () => void;
  seekBy: (seconds: number) => void;
  setSpeed: (multiplier: SpeedMultiplier) => void;
  stepSpeed: (direction: "up" | "down") => void;
  setRepeat: (mode: "on" | "off") => void;
  setSleepTimer: (minutes: number) => void;
  cancelSleepTimer: () => void;
  addToQueue: () => void;
  clearQueue: () => void;
};

export type VoicePreferenceServices = {
  savedIds: string[];
  downloadedIds: string[];
  followingIds: string[];
  update: (change: Partial<Preferences>) => void;
};

export type VoiceServices = {
  navigate: VoiceNavigationServices;
  playback: VoicePlaybackServices;
  preferences: VoicePreferenceServices;
  readScreen: () => string;
  data: {
    stories: ContentItem[];
    topics: Topic[];
    entities: Entity[];
  };
  voiceData: {
    resetVoiceCorrections: () => Promise<void>;
  };
};

export type VoiceExecutionResult = {
  ok: boolean;
  feedback?: string;
  errorCode?: "invalid-invocation" | "duplicate" | "execution-failed";
};

export interface VoiceExecutor {
  execute(
    invocation: VoiceInvocation,
    services: VoiceServices,
  ): Promise<VoiceExecutionResult>;
}

export type PlayCommandInput = {
  mode: PlayMode;
  storyId?: string;
  topicId?: string;
  locationId?: string;
  entityId?: string;
  entityType?: "organization" | "publication" | "creator" | "category";
  entityName?: string;
};

export type VoiceDiagnostic = {
  timestamp: number;
  outcome: "success" | "clarification" | "error" | "cancelled";
  latencyBand: "under-100ms" | "100-300ms" | "300ms-1s" | "over-1s";
  confidenceBand: "low" | "medium" | "high";
  actionId?: string;
  databaseVersion?: number;
  errorCode?: string;
  recognitionPurpose?: RecognitionPurpose;
  speechLocale?: string;
};

export interface VoiceDiagnostics {
  record(event: VoiceDiagnostic): Promise<void>;
  reset(): Promise<void>;
  export(): Promise<VoiceDiagnostic[]>;
}
