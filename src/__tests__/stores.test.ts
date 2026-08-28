import {
  initialPreferences,
  usePlaybackStore,
  useContentStore,
  usePreferencesStore,
  useVoiceStore,
  useAccountStore,
} from "@/stores";
import { migratePreferences } from "@/stores/preferences-store";
import { hearCatalogueService } from "@/services/content/hear-catalogue-service";
import { onboardingVoiceBridge, useOnboardingVoiceStore } from "@/stores/onboarding-voice-store";
describe("Zustand stores", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ ...initialPreferences, hydrated: true });
    usePlaybackStore.setState({
      current: undefined,
      playing: false,
      progress: 0,
      speed: 1,
      repeat: false,
      queue: [],
      queueMode: "single",
      playbackSessionId: "",
      completion: undefined,
      sleepTimerEndsAt: null,
    });
    useContentStore.setState({
      stories: [],
      topics: [],
      entities: [],
      history: [],
      loading: false,
      loadingMore: false,
      refreshing: false,
      initialLoadComplete: false,
      page: -1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
      remaining: 0,
      hasMore: false,
      error: null,
      loadMoreError: null,
    });
    useVoiceStore.getState().resetVoice();
    useAccountStore.getState().clear();
    useOnboardingVoiceStore.setState({
      gestureLessonActive: false,
      gestureLessonCompleted: false,
      voiceInvocationAllowed: false,
    });
  });
  it("updates and resets preferences", () => {
    usePreferencesStore
      .getState()
      .updatePreferences({ town: "London, UK", savedIds: ["tech"] });
    expect(usePreferencesStore.getState()).toMatchObject({
      town: "London, UK",
      savedIds: ["tech"],
    });
    usePreferencesStore.getState().resetPreferences();
    expect(usePreferencesStore.getState()).toMatchObject(initialPreferences);
  });
  it("restores playback-friendly state while keeping actions functional", () => {
    usePlaybackStore.getState().play({
      id: "remote-story",
      title: "Remote story",
      creator: "Hear! creator",
      publication: "Hear!",
      duration: "2:00",
      category: "News",
      color: "#5B3B82",
      audioUrl: "https://cdn.hear.media/remote-story.mp3",
      audioDurationSeconds: 120,
      origin: "hear-search",
    });
    expect(usePlaybackStore.getState().playing).toBe(true);
    usePlaybackStore.getState().seekBy(15);
    expect(usePlaybackStore.getState().progress).toBeGreaterThan(0);
    usePlaybackStore.getState().pause();
    expect(usePlaybackStore.getState().playing).toBe(false);
  });

  it("does not invent playback when no Hear! result is loaded", () => {
    usePlaybackStore.getState().play();
    expect(usePlaybackStore.getState()).toMatchObject({
      current: undefined,
      playing: false,
    });
  });
  it("keeps listening history empty until real remote audio starts", () => {
    expect(useContentStore.getState().history).toEqual([]);
    const item = {
      id: "remote-history",
      title: "A real Hear! story",
      creator: "Hear! creator",
      publication: "Hear! Daily",
      duration: "2:00",
      category: "News",
      color: "#5B3B82",
      audioUrl: "https://cdn.hear.media/history.mp3",
      origin: "hear-search" as const,
    };
    useContentStore.getState().recordHistory(item, 0);
    expect(useContentStore.getState().history).toMatchObject([
      {
        label: "TODAY",
        rows: [
          {
            storyId: "remote-history",
            item: { title: "A real Hear! story" },
            meta: "Started · Hear! Daily",
          },
        ],
      },
    ]);
  });
  it("loads catalogue pages once, deduplicates tracks, and keeps server limits", async () => {
    const first = remoteItem("first");
    const second = remoteItem("second");
    const search = jest
      .spyOn(hearCatalogueService, "search")
      .mockResolvedValueOnce({
        items: [first],
        page: 0,
        limit: 1,
        total: 2,
        totalPages: 2,
        remaining: 1,
      })
      .mockResolvedValueOnce({
        items: [first, second],
        page: 1,
        limit: 1,
        total: 2,
        totalPages: 2,
        remaining: 0,
      });

    await useContentStore.getState().fetchCatalogue();
    const firstLoadMore = useContentStore.getState().loadNextPage();
    const duplicateLoadMore = useContentStore.getState().loadNextPage();
    await Promise.all([firstLoadMore, duplicateLoadMore]);

    expect(search).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ page: 0, limit: 20 }),
    );
    expect(search).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ page: 1, limit: 20 }),
    );
    expect(search).toHaveBeenCalledTimes(2);
    expect(useContentStore.getState()).toMatchObject({
      stories: [{ id: "first" }, { id: "second" }],
      page: 1,
      pageSize: 1,
      total: 2,
      totalPages: 2,
      remaining: 0,
      hasMore: false,
      loadingMore: false,
    });
  });
  it("resets voice sessions completely", () => {
    useVoiceStore
      .getState()
      .setVoice({ state: "listening", transcript: "hello" });
    useVoiceStore.getState().resetVoice();
    expect(useVoiceStore.getState()).toMatchObject({
      state: "idle",
      transcript: "",
      choices: [],
    });
  });

  it("stores only the non-sensitive account profile state", () => {
    useAccountStore.getState().setProfile({
      provider: "google",
      providerUserId: "user-1",
      displayName: "Listener",
    });
    expect(useAccountStore.getState()).toMatchObject({
      status: "signedIn",
      profile: { provider: "google", displayName: "Listener" },
    });
    useAccountStore.getState().clear();
    expect(useAccountStore.getState().profile).toBeUndefined();
  });

  it("migrates older preferences with safe voice-first defaults", () => {
    expect(migratePreferences({ setupComplete: true, town: "London, UK" })).toMatchObject({
      setupComplete: true,
      onboardingVersion: 1,
      spokenGuidanceEnabled: false,
      town: "London, UK",
    });
  });

  it("consumes tutorial gesture without enabling a voice invocation", () => {
    useOnboardingVoiceStore.getState().setGestureLessonActive(true);
    expect(onboardingVoiceBridge.isGestureLessonActive()).toBe(true);
    onboardingVoiceBridge.completeGestureLesson();
    expect(useOnboardingVoiceStore.getState()).toMatchObject({
      gestureLessonActive: false,
      gestureLessonCompleted: true,
    });
  });

  it("can gate global voice invocation during the welcome chapter", () => {
    useOnboardingVoiceStore.getState().setVoiceInvocationAllowed(false);
    expect(onboardingVoiceBridge.isVoiceInvocationAllowed()).toBe(false);
  });

  it("resets the onboarding gesture lesson for setup replay", () => {
    useOnboardingVoiceStore.getState().setGestureLessonActive(true);
    onboardingVoiceBridge.completeGestureLesson();
    onboardingVoiceBridge.resetExperience();
    expect(useOnboardingVoiceStore.getState()).toMatchObject({
      gestureLessonActive: false,
      gestureLessonCompleted: false,
      voiceInvocationAllowed: false,
    });
  });
});

function remoteItem(id: string) {
  return {
    id,
    title: `Story ${id}`,
    creator: "Hear! creator",
    publication: "Hear! Daily",
    duration: "1:00",
    category: "News",
    color: "#5B3B82",
    audioUrl: `https://cdn.hear.media/${id}.mp3`,
    origin: "hear-search" as const,
  };
}
