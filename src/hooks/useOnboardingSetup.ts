import { useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useVoice } from "@/hooks/useVoice";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { speechCoordinator } from "@/lib/voice/speech-coordinator";
import { routes } from "@/navigation/routes";
import { useAppAccessibility } from "@/providers/AccessibilityProvider";
import { usePreferencesStore, useVoiceStore } from "@/stores";
import { onboardingVoiceBridge, useOnboardingVoiceStore } from "@/stores/onboarding-voice-store";
import type { OnboardingPhase, OnboardingScreenId } from "@/types";

const WELCOME_SPEECH =
  "Welcome to Hear. Hear can read each screen aloud and respond to one voice command at a time. Double-tap anywhere to continue.";
const PERMISSION_SPEECH =
  "Voice access. Hear listens only after you double-tap and stops after one command. Double-tap anywhere to allow access and speak a command.";
const ACCOUNT_SPEECH =
  "Your account is optional. Continue with your device account to sync Hear, or say not now to open Hear without signing in.";

export function useOnboardingSetup() {
  const router = useRouter();
  const voice = useVoice();
  const account = useAccountAccess();
  const accessibility = useAppAccessibility();
  const updatePreferences = usePreferencesStore((state) => state.updatePreferences);
  const [screen, setScreen] = useState<OnboardingScreenId>("welcome");
  const completed = useRef(false);
  const welcomed = useRef(false);
  const voiceReady = useRef(false);
  const lastCommandId = useRef(0);

  const complete = useCallback((withVoice: boolean) => {
    if (completed.current) return;
    completed.current = true;
    onboardingVoiceBridge.setGestureMode("inactive");
    router.replace(routes.home);
    updatePreferences({
      setupComplete: true,
      onboardingVersion: 4,
      spokenGuidanceEnabled: true,
    });
    accessibility.announce(
      withVoice ? "Voice is ready. Opening Hear." : "Opening Hear without voice access.",
      "onboarding:complete",
    );
  }, [accessibility, router, updatePreferences]);

  useLayoutEffect(() => {
    onboardingVoiceBridge.setGestureMode(
      screen === "welcome"
        ? "advanceWelcome"
        : screen === "voicePermission"
          ? "startVoicePractice"
          : "inactive",
    );
    onboardingVoiceBridge.registerStep({
      stepIndex: screen === "welcome" ? 0 : screen === "voicePermission" ? 1 : 2,
      totalSteps: 3,
      title: screen === "welcome" ? "Welcome" : screen === "voicePermission" ? "Voice access" : "Optional account",
      description: screen === "welcome"
        ? "Listen without searching through screens."
        : screen === "voicePermission"
          ? "Speak when you choose."
          : "Sync your listening or continue without an account.",
      options: screen === "welcome"
        ? ["Double-tap anywhere to continue"]
        : screen === "voicePermission"
          ? ["Double-tap to enable voice", "Continue without voice"]
          : ["Continue with device account", "Not now"],
    });
  }, [screen]);

  const announceCurrent = useCallback(() => {
    if (screen === "welcome") {
      if (!welcomed.current) {
        welcomed.current = true;
        updatePreferences({ spokenGuidanceEnabled: true });
      }
      accessibility.announce(WELCOME_SPEECH, "onboarding:welcome");
      return;
    }
    accessibility.announce(
      screen === "voicePermission" ? PERMISSION_SPEECH : ACCOUNT_SPEECH,
      `onboarding:${screen}`,
    );
  }, [accessibility, screen, updatePreferences]);

  useEffect(() => useOnboardingVoiceStore.subscribe((state, previous) => {
    if (
      state.gestureEvent?.id !== previous.gestureEvent?.id &&
      state.gestureEvent?.mode === "advanceWelcome"
    ) {
      setScreen("voicePermission");
    }
  }), []);

  useEffect(() => useOnboardingVoiceStore.subscribe((state) => {
    const command = state.lastCommand;
    if (!command || command.id === lastCommandId.current) return;
    lastCommandId.current = command.id;
    if (command.type === "back") {
      setScreen((current) => current === "account" ? "voicePermission" : "welcome");
      return;
    }
    if (screen === "account" && command.type === "skip") {
      voice.close();
      complete(voiceReady.current);
      return;
    }
    if (screen === "account" && command.type === "continue") {
      voice.close();
      void account.signIn().then((signedIn) => {
        if (signedIn) complete(voiceReady.current);
      });
    }
  }), [account, complete, screen, voice]);

  useEffect(() => useVoiceStore.subscribe((state, previous) => {
    if (
      screen === "voicePermission" &&
      state.state === "success" &&
      previous.state !== "success"
    ) {
      voiceReady.current = true;
      voice.close();
      setScreen("account");
    }
  }), [screen, voice]);

  useEffect(() => {
    if (screen === "account" && account.profile) {
      voice.close();
      complete(voiceReady.current);
    }
  }, [account.profile, complete, screen, voice]);

  useEffect(() => () => {
    onboardingVoiceBridge.setGestureMode("inactive");
    void speechCoordinator.cancel("onboarding:");
  }, []);

  const phase: OnboardingPhase =
    screen === "welcome" ? "welcome"
      : screen === "account" ? "complete"
      : voice.state === "permission" ? "requestingPermission"
      : voice.state === "preparing" ? "preparing"
      : voice.state === "listening" ? "listening"
      : voice.state === "resolving" || voice.state === "executing" ? "resolving"
      : voice.state === "clarifying" ? "clarification"
      : voice.errorCode === "recognition-unavailable" ? "unsupported"
      : voice.state === "error"
        ? voice.errorCode === "permission-denied" ? "denied" : "error"
        : "permissionPrimer";

  return {
    screen,
    phase,
    screenReaderEnabled: accessibility.screenReaderEnabled,
    announceCurrent,
    advanceWelcome: () => setScreen("voicePermission"),
    startVoicePractice: () =>
      void voice.startVoiceSession({ source: "onboardingPractice" }),
    back: () => setScreen(screen === "account" ? "voicePermission" : "welcome"),
    continueWithoutVoice: () => setScreen("account"),
    account,
    signIn: async () => {
      const signedIn = await account.signIn();
      if (signedIn) complete(voiceReady.current);
    },
    skipAccount: () => complete(voiceReady.current),
  };
}
