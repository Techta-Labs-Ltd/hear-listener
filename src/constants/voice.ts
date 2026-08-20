import type { VoiceExecutorKey, VoiceState } from "@/types";

export const VOICE_TIMING = {
  noSpeechTimeout: 8000,
  gentleReminder: 4000,
  maxRecognitionDuration: 30000,
  resolutionTimeout: 5000,
  contextualTermsLimit: 80,
  androidMinSpeechInputMs: 500,
  androidSilenceLengthMs: 1400,
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

