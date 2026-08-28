import type { ContentItem } from "./content";
export type SpeedMultiplier = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;
export type RepeatMode = "on" | "off";
export type SleepTimerOptionId = "15" | "30" | "end";
export type PlaybackQueueMode = "single" | "publication";
export type PlaybackQueueOptions = {
  mode?: PlaybackQueueMode;
};
export type PlaybackCompletion = {
  sequence: number;
  kind: "publication";
  publicationId?: string;
  publicationTitle: string;
  listenedTrackIds: string[];
  playbackSessionId: string;
};
export type PlaybackSnapshot = {
  current?: ContentItem;
  playing: boolean;
  progress: number;
  durationSeconds: number;
  speed: SpeedMultiplier;
  repeat: boolean;
  queue: ContentItem[];
  queueMode: PlaybackQueueMode;
  playbackSessionId: string;
  completion?: PlaybackCompletion;
  sleepTimerEndsAt: number | null;
};

export type PlaybackStore = PlaybackSnapshot & {
  hydrated: boolean;
  seekToken: number;
  completionSequence: number;
  play: (item?: ContentItem) => void;
  playQueue: (items: ContentItem[], options?: PlaybackQueueOptions) => void;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  seekBy: (seconds: number) => void;
  setTiming: (progress: number, durationSeconds: number) => void;
  next: () => void;
  previous: () => void;
  handleTrackFinished: () => void;
  clearCompletion: () => void;
  restart: () => void;
  setSpeed: (value: SpeedMultiplier) => void;
  stepSpeed: (direction: "up" | "down") => void;
  setRepeat: (mode: RepeatMode) => void;
  setSleepTimer: (minutes: number) => void;
  cancelSleepTimer: () => void;
  addToQueue: () => void;
  clearQueue: () => void;
};
