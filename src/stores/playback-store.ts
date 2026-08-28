import { safeAsyncStorage } from "@/lib/storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { PLAYBACK_SPEED_OPTIONS } from "@/constants/voice-execution";
import type { ContentItem, PlaybackStore } from "@/types";

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
      queueMode: "single",
      playbackSessionId: "",
      completion: undefined,
      sleepTimerEndsAt: null,
      hydrated: false,
      seekToken: 0,
      completionSequence: 0,
      play: (item) => {
        if (!item) {
          if (get().current) set({ playing: true });
          return;
        }
        if (!isRemotePlayable(item)) return;
        set((state) => ({
          current: item,
          queue: [item],
          queueMode: "single",
          playbackSessionId: createPlaybackSessionId(),
          completion: undefined,
          progress: item.progress ?? 0,
          durationSeconds: playableDuration(item),
          playing: true,
          seekToken: state.seekToken + 1,
        }));
      },
      playQueue: (items, options) => {
        const playable = items.filter(isRemotePlayable);
        const first = playable[0];
        if (!first) return;
        const mode = options?.mode ?? "single";
        const queue = mode === "publication" ? playable : [first];
        set((state) => ({
          current: first,
          queue,
          queueMode: mode,
          playbackSessionId: createPlaybackSessionId(),
          completion: undefined,
          progress: first.progress ?? 0,
          durationSeconds: playableDuration(first),
          playing: true,
          seekToken: state.seekToken + 1,
        }));
      },
      pause: () => set({ playing: false }),
      resume: () => {
        if (get().current) set({ playing: true });
      },
      toggle: () =>
        set((state) => ({
          playing: state.current ? !state.playing : false,
        })),
      seekBy: (seconds) =>
        set((state) =>
          state.current && state.durationSeconds > 0
            ? {
                progress: Math.max(
                  0,
                  Math.min(
                    1,
                    state.progress + seconds / state.durationSeconds,
                  ),
                ),
                seekToken: state.seekToken + 1,
              }
            : state,
        ),
      setTiming: (progress, durationSeconds) =>
        set({ progress, durationSeconds }),
      next: () => stepStory(1, get, set),
      previous: () => stepStory(-1, get, set),
      handleTrackFinished: () =>
        set((state) => {
          if (!state.current || state.repeat) return state;
          const index = state.queue.findIndex(
            (item) => item.id === state.current?.id,
          );
          if (
            state.queueMode === "publication" &&
            index >= 0 &&
            index < state.queue.length - 1
          ) {
            const next = state.queue[index + 1];
            return {
              current: next,
              progress: 0,
              durationSeconds: playableDuration(next),
              playing: true,
              seekToken: state.seekToken + 1,
            };
          }
          if (state.queueMode !== "publication") {
            return { playing: false, progress: 1 };
          }
          const sequence = state.completionSequence + 1;
          return {
            playing: false,
            progress: 1,
            completionSequence: sequence,
            completion: {
              sequence,
              kind: "publication",
              publicationId: state.current.publicationId,
              publicationTitle: state.current.publication,
              listenedTrackIds: state.queue.map((item) => item.id),
              playbackSessionId: state.playbackSessionId,
            },
          };
        }),
      clearCompletion: () => set({ completion: undefined }),
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
        set((state) =>
          state.current &&
          !state.queue.some((item) => item.id === state.current?.id)
            ? { queue: [...state.queue, state.current] }
            : state,
        ),
      clearQueue: () => set({ queue: [], queueMode: "single" }),
    }),
    {
      name: "hear-playback",
      version: 5,
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: ({
        current,
        progress,
        speed,
        repeat,
        queue,
        queueMode,
        playbackSessionId,
        sleepTimerEndsAt,
      }) => ({
        current,
        progress,
        speed,
        repeat,
        queue,
        queueMode,
        playbackSessionId,
        sleepTimerEndsAt,
      }),
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
  const queue = get().queue;
  if (queue.length === 0) return;
  const current = get().current;
  const source = queue;
  const index = current
    ? source.findIndex((story) => story.id === current.id)
    : -1;
  const nextIndex = Math.max(0, Math.min(source.length - 1, index + direction));
  if (nextIndex === index) return;
  const next = source[nextIndex];
  set({
    current: next,
    progress: 0,
    durationSeconds: playableDuration(next),
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
    queueMode: stored.queueMode === "publication" ? "publication" : "single",
    playbackSessionId:
      typeof stored.playbackSessionId === "string"
        ? stored.playbackSessionId
        : "",
    sleepTimerEndsAt: null,
  };
}

let playbackSessionSequence = 0;

function createPlaybackSessionId(): string {
  playbackSessionSequence += 1;
  return `playback-${Date.now().toString(36)}-${playbackSessionSequence.toString(36)}`;
}

function findStoredContent(value: unknown) {
  if (!isRecord(value) || typeof value.id !== "string") return undefined;
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
    ...(typeof value.creatorId === "string"
      ? { creatorId: value.creatorId }
      : {}),
    publication:
      typeof value.publication === "string" ? value.publication : "Hear!",
    ...(typeof value.publicationId === "string"
      ? { publicationId: value.publicationId }
      : {}),
    ...(typeof value.publicationTrackIndex === "number" &&
    Number.isInteger(value.publicationTrackIndex) &&
    value.publicationTrackIndex >= 0
      ? { publicationTrackIndex: value.publicationTrackIndex }
      : {}),
    ...(typeof value.publicationTrackCount === "number" &&
    Number.isInteger(value.publicationTrackCount) &&
    value.publicationTrackCount > 0
      ? { publicationTrackCount: value.publicationTrackCount }
      : {}),
    duration: typeof value.duration === "string" ? value.duration : "",
    category: typeof value.category === "string" ? value.category : "Audio",
    ...(typeof value.categoryId === "string"
      ? { categoryId: value.categoryId }
      : {}),
    color: typeof value.color === "string" ? value.color : "#5B3B82",
    audioUrl: value.audioUrl,
    origin: "hear-search" as const,
    ...(typeof value.description === "string"
      ? { description: value.description }
      : {}),
    ...(typeof value.audioDurationSeconds === "number" &&
    Number.isFinite(value.audioDurationSeconds) &&
    value.audioDurationSeconds > 0
      ? { audioDurationSeconds: value.audioDurationSeconds }
      : {}),
    ...(typeof value.organization === "string"
      ? { organization: value.organization }
      : {}),
    ...(typeof value.organizationId === "string"
      ? { organizationId: value.organizationId }
      : {}),
    ...(Array.isArray(value.tags)
      ? { tags: value.tags.filter((tag): tag is string => typeof tag === "string") }
      : {}),
    ...(typeof value.publishedAt === "string"
      ? { publishedAt: value.publishedAt }
      : {}),
    ...(Array.isArray(value.playbackSpeedUrls)
      ? {
          playbackSpeedUrls: value.playbackSpeedUrls.flatMap((entry) => {
            if (
              !isRecord(entry) ||
              typeof entry.speed !== "number" ||
              !Number.isFinite(entry.speed) ||
              typeof entry.url !== "string" ||
              !isHttpsUrl(entry.url)
            ) {
              return [];
            }
            return [{ speed: entry.speed, url: entry.url }];
          }),
        }
      : {}),
  };
}

function isRemotePlayable(item: ContentItem): boolean {
  return (
    item.origin === "hear-search" &&
    typeof item.audioUrl === "string" &&
    isHttpsUrl(item.audioUrl)
  );
}

function playableDuration(item: ContentItem): number {
  return item.audioDurationSeconds && item.audioDurationSeconds > 0
    ? item.audioDurationSeconds
    : 1080;
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
