import { safeAsyncStorage } from "@/lib/storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { stories } from "@/data/catalogue";
import { speedOptions, type PlaybackStore } from "@/types";

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
          progress: item.progress ?? 0,
          durationSeconds: item.audioDurationSeconds ?? 1080,
          playing: true,
        });
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
          const index = speedOptions.indexOf(state.speed);
          return {
            speed:
              speedOptions[
                Math.max(
                  0,
                  Math.min(
                    speedOptions.length - 1,
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
      version: 2,
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
  const index = current
    ? stories.findIndex((story) => story.id === current.id)
    : -1;
  const nextIndex = (index + direction + stories.length) % stories.length;
  const next = stories[nextIndex];
  set({
    current: next,
    progress: 0,
    durationSeconds: next.audioDurationSeconds ?? 1080,
    playing: true,
    seekToken: get().seekToken + 1,
  });
}

function migratePlayback(stored: unknown): Partial<PlaybackStore> {
  if (!isRecord(stored)) return { sleepTimerEndsAt: null };
  const current = findStoredStory(stored.current);
  const queue = Array.isArray(stored.queue)
    ? stored.queue.flatMap((item) => {
        const story = findStoredStory(item);
        return story ? [story] : [];
      })
    : [];
  const speed = speedOptions.find((value) => value === stored.speed) ?? 1;
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

function findStoredStory(value: unknown) {
  if (!isRecord(value) || typeof value.id !== "string") return undefined;
  return stories.find((story) => story.id === value.id);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
export function usePlayback() {
  return usePlaybackStore(
    useShallow(({ hydrated: _hydrated, ...playback }) => playback),
  );
}
