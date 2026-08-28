import { safeAsyncStorage } from "@/lib/storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { stories } from "@/data/catalogue";
import { PLAYBACK_SPEED_OPTIONS } from "@/constants/voice-execution";
import type { PlaybackStore } from "@/types";

export const usePlaybackStore = create<PlaybackStore>()(
  persist(
    (set, get) => ({
      current: undefined,
      playing: false,
      progress: 0,
      durationSeconds: 1080,
      speed: 1,
      repeat: false,
      queue: [],
      sleepTimerEndsAt: null,
      hydrated: false,
      seekToken: 0,
      play: (item = stories[0]) => {
        set({
          current: item,
          queue: [],
          progress: item.progress ?? 0,
          durationSeconds: item.audioDurationSeconds ?? 1080,
          playing: true,
        });
      },
      playQueue: (items) => {
        const playable = items.filter((item) => item.audioUrl);
        const first = playable[0];
        if (!first) return;
        set((state) => ({
          current: first,
          queue: playable,
          progress: first.progress ?? 0,
          durationSeconds: first.audioDurationSeconds ?? 1080,
          playing: true,
          seekToken: state.seekToken + 1,
        }));
      },
      pause: () => set({ playing: false }),
      resume: () => set({ playing: true }),
      toggle: () => set((state) => ({ playing: !state.playing })),
      seekBy: (seconds) =>
        set((state) => ({
          progress: Math.max(
            0,
            Math.min(1, state.progress + seconds / state.durationSeconds),
          ),
          seekToken: state.seekToken + 1,
        })),
      setTiming: (progress, durationSeconds) =>
        set({ progress, durationSeconds }),
      next: () => stepStory(1, get, set),
      previous: () => stepStory(-1, get, set),
      restart: () =>
        set((state) => ({
          progress: 0,
          playing: true,
          seekToken: state.seekToken + 1,
        })),
      setSpeed: (speed) => set({ speed }),
      stepSpeed: (direction) =>
        set((state) => {
          const index = PLAYBACK_SPEED_OPTIONS.indexOf(state.speed);
          return {
            speed:
              PLAYBACK_SPEED_OPTIONS[
                Math.max(
                  0,
                  Math.min(
                    PLAYBACK_SPEED_OPTIONS.length - 1,
                    index + (direction === "up" ? 1 : -1),
                  ),
                )
              ],
          };
        }),
      setRepeat: (mode) => set({ repeat: mode === "on" }),
      setSleepTimer: (minutes) =>
        set({ sleepTimerEndsAt: Date.now() + minutes * 60_000 }),
      cancelSleepTimer: () => set({ sleepTimerEndsAt: null }),
      addToQueue: () =>
        set((state) => ({
          queue: state.current ? [...state.queue, state.current] : state.queue,
        })),
      clearQueue: () => set({ queue: [] }),
    }),
    {
      name: "hear-playback",
      version: 3,
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: ({
        current,
        progress,
        speed,
        repeat,
        queue,
        sleepTimerEndsAt,
      }) => ({ current, progress, speed, repeat, queue, sleepTimerEndsAt }),
      migrate: migratePlayback,
      onRehydrateStorage: () => () =>
        usePlaybackStore.setState({ hydrated: true, playing: false }),
    },
  ),
);

function stepStory(
  direction: 1 | -1,
  get: () => PlaybackStore,
  set: (change: Partial<PlaybackStore>) => void,
) {
  const current = get().current;
  const queue = get().queue;
  const source =
    current?.origin === "hear-search" && queue.length > 0 ? queue : stories;
  const index = current
    ? source.findIndex((story) => story.id === current.id)
    : -1;
  const nextIndex = (index + direction + source.length) % source.length;
  const next = source[nextIndex];
  set({
    current: next,
    progress: 0,
    durationSeconds: next.audioDurationSeconds ?? 1080,
    playing: true,
    seekToken: get().seekToken + 1,
  });
}

export function migratePlayback(stored: unknown): Partial<PlaybackStore> {
  if (!isRecord(stored)) return { sleepTimerEndsAt: null };
  const current = findStoredContent(stored.current);
  const queue = Array.isArray(stored.queue)
    ? stored.queue.flatMap((item) => {
        const story = findStoredContent(item);
        return story ? [story] : [];
      })
    : [];
  const speed =
    PLAYBACK_SPEED_OPTIONS.find((value) => value === stored.speed) ?? 1;
  const progress =
    typeof stored.progress === "number" && Number.isFinite(stored.progress)
      ? Math.max(0, Math.min(1, stored.progress))
      : 0;
  return {
    current,
    progress,
    speed,
    repeat: stored.repeat === true,
    queue,
    sleepTimerEndsAt: null,
  };
}

function findStoredContent(value: unknown) {
  if (!isRecord(value) || typeof value.id !== "string") return undefined;
  const catalogueStory = stories.find((story) => story.id === value.id);
  if (catalogueStory) return catalogueStory;
  if (
    value.origin !== "hear-search" ||
    typeof value.audioUrl !== "string" ||
    !isHttpsUrl(value.audioUrl) ||
    typeof value.title !== "string" ||
    typeof value.creator !== "string"
  ) {
    return undefined;
  }
  return {
    id: value.id,
    title: value.title,
    creator: value.creator,
    publication:
      typeof value.publication === "string" ? value.publication : "Hear!",
    duration: typeof value.duration === "string" ? value.duration : "",
    category: typeof value.category === "string" ? value.category : "Audio",
    color: typeof value.color === "string" ? value.color : "#5B3B82",
    audioUrl: value.audioUrl,
    origin: "hear-search" as const,
    ...(typeof value.description === "string"
      ? { description: value.description }
      : {}),
    ...(typeof value.audioDurationSeconds === "number" &&
    Number.isFinite(value.audioDurationSeconds)
      ? { audioDurationSeconds: value.audioDurationSeconds }
      : {}),
    ...(typeof value.organization === "string"
      ? { organization: value.organization }
      : {}),
    ...(Array.isArray(value.tags)
      ? { tags: value.tags.filter((tag): tag is string => typeof tag === "string") }
      : {}),
    ...(typeof value.publishedAt === "string"
      ? { publishedAt: value.publishedAt }
      : {}),
  };
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
export function usePlayback() {
  return usePlaybackStore(
    useShallow(({ hydrated: _hydrated, ...playback }) => playback),
  );
}
