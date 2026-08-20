import { useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useVoice } from "@/hooks/useVoice";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { speechCoordinator } from "@/services/voice/speech-coordinator";
import { routes } from "@/navigation/routes";
import { useAppAccessibility } from "@/providers/AccessibilityProvider";
import { usePreferencesStore, useVoiceStore } from "@/stores";
import {
  onboardingVoiceBridge,
  useOnboardingVoiceStore,
} from "@/stores/onboarding-voice-store";
import { ACTIVE_VOICE_STATES } from "@/constants/voice";
import { ONBOARDING_SPEECH } from "@/constants/onboarding-steps";
import type {
  AccountProvider,
  OnboardingPhase,
  OnboardingScreenId,
} from "@/types";

export function useOnboardingSetup() {
  const router = useRouter();
  const voice = useVoice();
  const account = useAccountAccess();
  const accessibility = useAppAccessibility();
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const [screen, setScreen] = useState<OnboardingScreenId>("welcome");
  const completed = useRef(false);
  const welcomed = useRef(false);
  const voiceReady = useRef(false);
  const lastCommandId = useRef(0);

  const complete = useCallback(
    (withVoice: boolean) => {
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
        withVoice
          ? "Voice is ready. Opening Hear."
          : "Opening Hear without voice access.",
        "onboarding:complete",
      );
    },
    [accessibility, router, updatePreferences],
  );

  useLayoutEffect(() => {
    onboardingVoiceBridge.setGestureMode(
      screen === "welcome"
        ? "advanceWelcome"
        : screen === "voiceAccess" || screen === "voiceTest"
          ? "startVoicePractice"
          : "inactive",
    );
    onboardingVoiceBridge.registerStep({
      stepIndex: screen === "welcome" ? 0 : screen === "account" ? 2 : 1,
      totalSteps: 3,
      title:
        screen === "welcome"
          ? "Welcome"
          : screen === "voiceAccess"
            ? "Voice access"
            : screen === "voiceTest"
              ? "Voice practice"
              : "Optional account",
      description:
        screen === "welcome"
          ? "Hear what matters. Skip the screens."
          : screen === "voiceAccess"
            ? "Hear listens only after you call it."
            : screen === "voiceTest"
              ? "Let's try one command."
              : "Keep your listening with you.",
      options:
        screen === "welcome"
          ? ["Double-tap anywhere to begin voice setup"]
          : screen === "voiceAccess"
            ? ["Double-tap to show microphone access"]
            : screen === "voiceTest"
              ? ["Say “Play my local news.”", "Say “cancel” to stop"]
              : ["Continue with Apple", "Continue with Google", "Not now"],
    });
  }, [screen]);

  const announceCurrent = useCallback(() => {
    if (screen === "welcome") {
      if (!welcomed.current) {
        welcomed.current = true;
        updatePreferences({ spokenGuidanceEnabled: true });
      }
      accessibility.announce(ONBOARDING_SPEECH.welcome, "onboarding:welcome");
      return;
    }
    accessibility.announce(
      screen === "voiceAccess"
        ? ONBOARDING_SPEECH.access
        : screen === "voiceTest"
          ? ONBOARDING_SPEECH.test
          : ONBOARDING_SPEECH.account,
      `onboarding:${screen}`,
    );
  }, [accessibility, screen, updatePreferences]);

  useEffect(
    () =>
      useOnboardingVoiceStore.subscribe((state, previous) => {
        if (
          state.gestureEvent?.id !== previous.gestureEvent?.id &&
          state.gestureEvent?.mode === "advanceWelcome"
        ) {
          setScreen("voiceAccess");
        }
      }),
    [],
  );

  useEffect(
    () =>
      useOnboardingVoiceStore.subscribe((state) => {
        const command = state.lastCommand;
        if (!command || command.id === lastCommandId.current) return;
        lastCommandId.current = command.id;
        if (command.type === "back") {
          if (screen === "voiceTest") voice.close();
          setScreen(
            screen === "account" || screen === "voiceTest"
              ? "voiceAccess"
              : "welcome",
          );
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
      }),
    [account, complete, screen, voice],
  );

  useEffect(
    () =>
      useVoiceStore.subscribe((state, previous) => {
        const sessionBecameActive =
          ACTIVE_VOICE_STATES.has(state.state) &&
          !ACTIVE_VOICE_STATES.has(previous.state);
        if (screen === "voiceAccess" && sessionBecameActive) {
          setScreen("voiceTest");
          return;
        }
        if (
          (screen === "voiceAccess" || screen === "voiceTest") &&
          state.state === "success" &&
          previous.state !== "success"
        ) {
          voiceReady.current = true;
          voice.close();
          setScreen("account");
          return;
        }

        const sessionClosed =
          (state.state === "idle" ||
            state.state === "cancelled" ||
            state.state === "error") &&
          ACTIVE_VOICE_STATES.has(previous.state);
        if (screen === "voiceTest" && sessionClosed && !voiceReady.current) {
          setScreen("voiceAccess");
        }
      }),
    [screen, voice],
  );

  useEffect(() => {
    if (screen === "account" && account.profile) {
      voice.close();
      complete(voiceReady.current);
    }
  }, [account.profile, complete, screen, voice]);

  useEffect(
    () => () => {
      onboardingVoiceBridge.setGestureMode("inactive");
      void speechCoordinator.cancel("onboarding:");
    },
    [],
  );

  const phase: OnboardingPhase =
    screen === "welcome"
      ? "welcome"
      : screen === "account"
        ? "complete"
        : voice.state === "permission"
          ? "requestingPermission"
          : voice.state === "preparing"
            ? "preparing"
            : voice.state === "listening"
              ? "listening"
              : voice.state === "resolving" || voice.state === "executing"
                ? "resolving"
                : voice.state === "clarifying"
                  ? "clarification"
                  : voice.errorCode === "recognition-unavailable"
                    ? "unsupported"
                    : voice.state === "error"
                      ? voice.errorCode === "permission-denied"
                        ? "denied"
                        : "error"
                      : "permissionPrimer";

  return {
    screen,
    phase,
    screenReaderEnabled: accessibility.screenReaderEnabled,
    voiceState: voice.state,
    voiceMessage: voice.message,
    announceCurrent,
    advanceWelcome: () => setScreen("voiceAccess"),
    startVoicePractice: () =>
      void voice.startVoiceSession({ source: "onboardingPractice" }),
    back: () => {
      if (screen === "voiceTest") voice.close();
      setScreen(
        screen === "welcome"
          ? "welcome"
          : screen === "voiceAccess"
            ? "welcome"
            : "voiceAccess",
      );
    },
    continueWithoutVoice: () => setScreen("account"),
    account,
    signIn: async (provider?: AccountProvider) => {
      const signedIn = await account.signIn(provider);
      if (signedIn) complete(voiceReady.current);
    },
    skipAccount: () => complete(voiceReady.current),
  };
}
