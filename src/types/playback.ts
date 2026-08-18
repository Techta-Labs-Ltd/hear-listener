import type { ContentItem } from "./content";
export const speedOptions = [0.75, 1, 1.25, 1.5, 2] as const;
export type SpeedMultiplier = (typeof speedOptions)[number];
export type RepeatMode = "on" | "off";
export type SleepTimerOptionId = "15" | "30" | "end";
export type PlaybackSnapshot = {
  current?: ContentItem;
  playing: boolean;
  progress: number;
  durationSeconds: number;
  speed: SpeedMultiplier;
  repeat: boolean;
  queue: ContentItem[];
  sleepTimerEndsAt: number | null;
};

export type PlaybackStore = PlaybackSnapshot & {
  hydrated: boolean;
  seekToken: number;
  play: (item?: ContentItem) => void;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  seekBy: (seconds: number) => void;
  setTiming: (progress: number, durationSeconds: number) => void;
  next: () => void;
  previous: () => void;
  restart: () => void;
  setSpeed: (value: SpeedMultiplier) => void;
  stepSpeed: (direction: "up" | "down") => void;
  setRepeat: (mode: RepeatMode) => void;
  setSleepTimer: (minutes: number) => void;
  cancelSleepTimer: () => void;
  addToQueue: () => void;
  clearQueue: () => void;
};
