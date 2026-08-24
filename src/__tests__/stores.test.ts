import {
  initialPreferences,
  usePlaybackStore,
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
      sleepTimerEndsAt: null,
    });
    useVoiceStore.getState().resetVoice();
    useAccountStore.getState().clear();
    useOnboardingVoiceStore.setState({
      gestureLessonActive: false,
      gestureLessonCompleted: false,
      voiceInvocationAllowed: true,
    });
  });
  it("updates and resets preferences", () => {
    usePreferencesStore
      .getState()
      .updatePreferences({ town: "Lagos", savedIds: ["tech"] });
    expect(usePreferencesStore.getState()).toMatchObject({
      town: "Lagos",
      savedIds: ["tech"],
    });
    usePreferencesStore.getState().resetPreferences();
    expect(usePreferencesStore.getState()).toMatchObject(initialPreferences);
  });
  it("restores playback-friendly state while keeping actions functional", () => {
    usePlaybackStore.getState().play();
    expect(usePlaybackStore.getState().playing).toBe(true);
    usePlaybackStore.getState().seekBy(15);
    expect(usePlaybackStore.getState().progress).toBeGreaterThan(0);
    usePlaybackStore.getState().pause();
    expect(usePlaybackStore.getState().playing).toBe(false);
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
    expect(migratePreferences({ setupComplete: true, town: "Lagos" })).toMatchObject({
      setupComplete: true,
      onboardingVersion: 1,
      spokenGuidanceEnabled: false,
      town: "Lagos",
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
      voiceInvocationAllowed: true,
    });
  });
});
