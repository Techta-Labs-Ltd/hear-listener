import type { VoiceExecutorKey, VoiceState } from "@/types";

export const VOICE_TIMING = {
  preSpeechTimeout: 8000,
  noSpeechHapticReminder: 4000,
  noSpeechTimeout: 8000,
  gentleReminder: 4000,
  postSpeechSilence: 1200,
  maxTranscriptCharacters: 800,
  recognitionActivityWatchdog: 45000,
  maxRecognitionDuration: 60000,
  resolutionTimeout: 15000,
  contextualTermsLimit: 80,
  androidMinSpeechInputMs: 1500,
  androidPossibleSilenceMs: 8000,
  androidCompleteSilenceMs: 8000,
  androidSilenceLengthMs: 8000,
  firstIdleReminder: 15000,
  secondIdleReminder: 35000,
} as const;

export const PLAYBACK_EXECUTORS: ReadonlySet<VoiceExecutorKey> =
  new Set<VoiceExecutorKey>([
    "play",
    "pause",
    "resume",
    "next",
    "previous",
    "restart",
    "repeat",
    "seek",
    "speed",
    "speedStep",
  ]);

export const ACTIVE_VOICE_STATES: ReadonlySet<VoiceState> = new Set<VoiceState>([
  "preparing",
  "listening",
  "resolving",
  "executing",
  "clarifying",
]);

export const VOICE_LANGUAGE = "en-GB";
export const VOICE_MAX_ALTERNATIVES = 5;

export const LISTENING_PHASE_COPY = {
  initializing: {
    badge: "GETTING READY",
    title: "Getting everything ready.",
    sub: "Hear asks for microphone access first. Your phone owns the dialog.",
  },
  listening: {
    badge: "LISTENING",
    title: "Speak naturally.",
    sub: "I’ll show what I heard, then find your news.",
  },
  working: {
    badge: "ONE MOMENT",
    title: "Working on that.",
    sub: "Finding the best match.",
  },
} as const;

export const VOICE_STATE_BADGES: Record<VoiceState, string> = {
  idle: "VOICE READY",
  permission: "CHECKING ACCESS",
  preparing: "GETTING READY",
  listening: "LISTENING",
  resolving: "I HEARD",
  clarifying: "ONE MORE THING",
  executing: "WORKING ON THAT",
  success: "DONE",
  error: "I DIDN’T HEAR A COMMAND",
  cancelled: "VOICE CLOSED",
};

export const EXTERNAL_RESOLVER_CONFIG = {
  baseUrl: process.env.EXPO_PUBLIC_RESOLVER_URL || "https://resolver.hear.media",
  resolveEndpoint: "/v1/resolve",
  timeoutMs: 15000,
  clientName: "hear-listener",
  clientVersion: "1.0.0",
} as const;
