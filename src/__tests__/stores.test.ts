import {
  initialPreferences,
  usePlaybackStore,
  useContentStore,
  usePreferencesStore,
  useVoiceStore,
  useAccountStore,
} from "@/stores";
import { migratePreferences } from "@/stores/preferences-store";
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
    useContentStore.setState({ history: [] });
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
