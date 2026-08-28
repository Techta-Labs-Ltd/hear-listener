import { useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, Linking, Platform } from "react-native";
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
import {
  ONBOARDING_IDLE_HINTS,
  ONBOARDING_IDLE_HINTS_2,
  SCREEN_IDLE_TIMEOUT_1,
  SCREEN_IDLE_TIMEOUT_2,
} from "@/constants/screen-hints";
import { appHaptics } from "@/lib/haptics";
import {
  checkMicrophonePermissionStatus,
  requestMicrophonePermissionSafely,
} from "@/services/voice/microphone-permission-service";
import {
  validateAccountChoice,
  validateVoiceTestCommand,
} from "@/validation/onboarding-validation";
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

  const [phase, setPhase] = useState<OnboardingPhase>("welcome");
  const completed = useRef(false);
  const voiceReady = useRef(false);
  const prevPhase = useRef<OnboardingPhase | null>(null);
  const lastCommandId = useRef(0);
  const isAccountListening = useRef(false);
  const isTransitioning = useRef(false);
  const idleTimer1 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const idleTimer2 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearIdleTimers = useCallback(() => {
    if (idleTimer1.current) clearTimeout(idleTimer1.current);
    if (idleTimer2.current) clearTimeout(idleTimer2.current);
    idleTimer1.current = undefined;
    idleTimer2.current = undefined;
  }, []);

  const complete = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    clearIdleTimers();
    onboardingVoiceBridge.setGestureMode("inactive");
    onboardingVoiceBridge.setVoiceInvocationAllowed(true);
    void speechCoordinator.cancel();
    voice.close();
    router.replace(routes.home);
    updatePreferences({
      setupComplete: true,
      onboardingVersion: 4,
      spokenGuidanceEnabled: true,
    });
    accessibility.announceGuidedInstruction(
      ONBOARDING_SPEECH.complete,
      "onboarding:complete",
    );
  }, [accessibility, clearIdleTimers, router, updatePreferences, voice]);

  useLayoutEffect(() => {
    let gestureMode:
      | "advanceWelcome"
      | "requestPermission"
      | "startVoiceTest"
      | "permissionDenied"
      | "accountSelection"
      | "inactive" = "inactive";
    let stepIndex = 0;
    let title = "Welcome";
    let description = "Hear! what matters. Skip the screens.";
    let options = ["Shake device to begin voice setup"];

    if (phase === "welcome") {
      gestureMode = "advanceWelcome";
      stepIndex = 0;
      title = "Welcome";
      description = "Hear! what matters. Skip the screens.";
      options = ["Shake device to begin voice setup"];
    } else if (
      phase === "permissionIntro" ||
      phase === "requestingPermission" ||
      phase === "permissionDenied" ||
      phase === "permissionBlocked" ||
      phase === "voiceTestReady" ||
      phase === "voiceTestListening" ||
      phase === "voiceTestSuccess" ||
      phase === "voiceTestError"
    ) {
      stepIndex = 1;
      title = "Voice access";
      if (phase === "permissionDenied") {
        gestureMode = "requestPermission";
        description = "Microphone access is off.";
        options = ["Shake device to request microphone permission again"];
      } else if (phase === "permissionBlocked") {
        gestureMode = "permissionDenied";
        description = "Microphone access is off.";
        options = ["Shake device to open Hear! microphone settings"];
      } else if (phase === "voiceTestReady" || phase === "voiceTestError") {
        gestureMode = "startVoiceTest";
        description = "Let's try one command.";
        options = ["Say “Play my local news.”", "Shake device to try again"];
      } else if (phase === "voiceTestListening") {
        gestureMode = "inactive";
        description = "Hear! is listening.";
        options = ["Say “Play my local news.”"];
      } else {
        gestureMode = "requestPermission";
        description = "Hear! listens only after you call it.";
        options = ["Shake device to request microphone permission"];
      }
    } else if (phase === "account") {
      gestureMode = "accountSelection";
      stepIndex = 2;
      title = "Optional account";
      description = "Keep your listening with you.";
      options =
        Platform.OS === "ios"
          ? ["Say Apple", "Say Not now"]
          : ["Say Google", "Say Not now"];
    }

    onboardingVoiceBridge.setVoiceInvocationAllowed(false);
    onboardingVoiceBridge.setGestureMode(gestureMode);
    onboardingVoiceBridge.registerStep({
      stepIndex,
      totalSteps: 3,
      title,
      description,
      options,
    });
  }, [phase]);

  const startVoiceTestSession = useCallback(
    async (introSpeech?: string) => {
      clearIdleTimers();
      if (introSpeech) {
        speechCoordinator.exitQuietMode();
        await speechCoordinator.speakBeforeListening({
          text: introSpeech,
          force: true,
        });
      } else {
        void speechCoordinator.cancel();
        speechCoordinator.exitQuietMode();
      }

      setPhase("voiceTestListening");
      void appHaptics.listening();

      void voice.startVoiceSession({
        source: "onboardingPractice",
        announceLocation: false,
      });
    },
    [clearIdleTimers, voice],
  );

  const startAccountVoiceSelection = useCallback(
    async (introSpeech?: string) => {
      clearIdleTimers();
      isAccountListening.current = true;
      if (introSpeech) {
        speechCoordinator.exitQuietMode();
        await speechCoordinator.speakBeforeListening({
          text: introSpeech,
          force: true,
        });
      } else {
        void speechCoordinator.cancel();
        speechCoordinator.exitQuietMode();
      }

      void appHaptics.listening();
      void voice.startVoiceSession({
        source: "onboardingPractice",
        announceLocation: false,
      });
    },
    [clearIdleTimers, voice],
  );

  const advanceWelcome = useCallback(async () => {
    clearIdleTimers();
    void speechCoordinator.cancel();
    const perm = await checkMicrophonePermissionStatus();
    if (perm.granted) {
      void appHaptics.success();
      void startVoiceTestSession();
    } else {
      setPhase("permissionIntro");
    }
  }, [clearIdleTimers, startVoiceTestSession]);

  useEffect(() => {
    if (prevPhase.current === phase) return;
    prevPhase.current = phase;

    if (phase === "welcome") {
      accessibility.announceGuidedInstruction(
        ONBOARDING_SPEECH.welcomeLong,
        "onboarding:welcome",
      );
    } else if (phase === "permissionIntro") {
      accessibility.announceGuidedInstruction(
        ONBOARDING_SPEECH.permissionIntro,
        "onboarding:permissionIntro",
      );
    } else if (phase === "permissionDenied") {
      void appHaptics.clarification();
      const msg =
        Platform.OS === "web"
          ? ONBOARDING_SPEECH.permissionDeniedWeb
          : ONBOARDING_SPEECH.permissionDenied;
      accessibility.announceGuidedInstruction(
        msg,
        "onboarding:permissionDenied",
      );
    } else if (phase === "permissionBlocked") {
      void appHaptics.clarification();
      const msg =
        Platform.OS === "web"
          ? ONBOARDING_SPEECH.permissionDeniedWeb
          : ONBOARDING_SPEECH.permissionBlocked;
      accessibility.announceGuidedInstruction(
        msg,
        "onboarding:permissionBlocked",
      );
    } else if (phase === "voiceTestError") {
      void appHaptics.error();
      const isNoSpeech =
        voice.errorCode === "no-speech" ||
        voice.errorCode === "no-speech-timeout";
      const isUnrecognised =
        voice.errorCode === "unrecognised" || voice.errorCode === "no_match";
      const msg = isNoSpeech
        ? ONBOARDING_SPEECH.voiceTestNoSpeech
        : isUnrecognised
          ? ONBOARDING_SPEECH.voiceTestNotRecognised
          : ONBOARDING_SPEECH.voiceTestError;
      accessibility.announceGuidedInstruction(
        msg,
        "onboarding:voiceTestError",
      );
    } else if (phase === "account") {
      if (!isTransitioning.current) {
        const accountIntro =
          Platform.OS === "ios"
            ? ONBOARDING_SPEECH.accountIos
            : ONBOARDING_SPEECH.accountAndroid;
        void startAccountVoiceSelection(accountIntro);
      }
      isTransitioning.current = false;
    }
  }, [
    accessibility,
    phase,
    startAccountVoiceSelection,
    voice.errorCode,
  ]);

  useEffect(() => {
    clearIdleTimers();

    if (
      phase === "welcome" ||
      phase === "permissionIntro" ||
      phase === "permissionDenied" ||
      phase === "permissionBlocked" ||
      phase === "voiceTestError" ||
      phase === "account"
    ) {
      idleTimer1.current = setTimeout(() => {
        if (phase === "welcome") {
          accessibility.announceGuidedInstruction(
            ONBOARDING_IDLE_HINTS.welcome,
            "idle1:welcome",
          );
        } else if (phase === "permissionIntro") {
          accessibility.announceGuidedInstruction(
            ONBOARDING_IDLE_HINTS.permissionIntro,
            "idle1:permissionIntro",
          );
        } else if (
          phase === "permissionDenied" ||
          phase === "permissionBlocked"
        ) {
          accessibility.announceGuidedInstruction(
            ONBOARDING_IDLE_HINTS.permissionDenied,
            "idle1:permissionDenied",
          );
        } else if (phase === "voiceTestError") {
          accessibility.announceGuidedInstruction(
            ONBOARDING_IDLE_HINTS.voiceTestError,
            "idle1:voiceTestError",
          );
        } else if (phase === "account" && !isAccountListening.current) {
          accessibility.announceGuidedInstruction(
            Platform.OS === "ios"
              ? ONBOARDING_IDLE_HINTS.accountIos
              : ONBOARDING_IDLE_HINTS.accountOther,
            "idle1:account",
          );
        }
      }, SCREEN_IDLE_TIMEOUT_1);

      idleTimer2.current = setTimeout(() => {
        if (phase === "welcome") {
          accessibility.announceGuidedInstruction(
            ONBOARDING_IDLE_HINTS_2.welcome,
            "idle2:welcome",
          );
        } else if (phase === "permissionIntro") {
          accessibility.announceGuidedInstruction(
            ONBOARDING_IDLE_HINTS_2.permissionIntro,
            "idle2:permissionIntro",
          );
        } else if (
          phase === "permissionDenied" ||
          phase === "permissionBlocked"
        ) {
          accessibility.announceGuidedInstruction(
            ONBOARDING_IDLE_HINTS_2.permissionDenied,
            "idle2:permissionDenied",
          );
        } else if (phase === "voiceTestError") {
          accessibility.announceGuidedInstruction(
            ONBOARDING_IDLE_HINTS_2.voiceTestError,
            "idle2:voiceTestError",
          );
        } else if (phase === "account" && !isAccountListening.current) {
          accessibility.announceGuidedInstruction(
            Platform.OS === "ios"
              ? ONBOARDING_IDLE_HINTS_2.accountIos
              : ONBOARDING_IDLE_HINTS_2.accountOther,
            "idle2:account",
          );
        }
      }, SCREEN_IDLE_TIMEOUT_2);
    }

    return () => {
      clearIdleTimers();
    };
  }, [accessibility, clearIdleTimers, phase]);

  const requestPermission = useCallback(async () => {
    clearIdleTimers();
    void speechCoordinator.cancel();
    void appHaptics.changed();
    setPhase("requestingPermission");
    const result = await requestMicrophonePermissionSafely();

    if (result.granted) {
      void appHaptics.success();
      void startVoiceTestSession(ONBOARDING_SPEECH.permissionGrantedFirstTest);
    } else if (result.status === "blocked") {
      setPhase("permissionBlocked");
    } else {
      setPhase("permissionDenied");
    }
  }, [clearIdleTimers, startVoiceTestSession]);

  const openSettings = useCallback(async () => {
    clearIdleTimers();
    void speechCoordinator.cancel();
    void appHaptics.changed();
    if (Platform.OS === "web") {
      void requestPermission();
      return;
    }
    try {
      await Linking.openSettings();
    } catch {
      accessibility.announceGuidedInstruction(
        "Unable to open Hear! settings. Open your phone Settings, select Hear!, then enable Microphone.",
        "onboarding:openSettingsFailed",
      );
    }
  }, [accessibility, clearIdleTimers, requestPermission]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (
          nextAppState === "active" &&
          (phase === "permissionDenied" ||
            phase === "permissionBlocked" ||
            phase === "requestingPermission")
        ) {
          void checkMicrophonePermissionStatus().then((status) => {
            if (status.granted) {
              void appHaptics.success();
              void startVoiceTestSession(ONBOARDING_SPEECH.permissionNowOn);
            } else {
              const msg =
                Platform.OS === "web"
                  ? ONBOARDING_SPEECH.permissionStillDeniedWeb
                  : status.canAskAgain === false
                    ? ONBOARDING_SPEECH.permissionStillDenied
                    : ONBOARDING_SPEECH.permissionDenied;
              accessibility.announceGuidedInstruction(
                msg,
                "onboarding:stillDenied",
              );
            }
          });
        }
      },
    );
    return () => subscription.remove();
  }, [accessibility, phase, startVoiceTestSession]);

  useEffect(() => {
    return useVoiceStore.subscribe((state, previous) => {
      if (phase === "voiceTestListening") {
        if (state.transcript && !voiceReady.current) {
          const result = validateVoiceTestCommand(state.transcript);
          if (result.valid) {
            voiceReady.current = true;
            isTransitioning.current = true;
            voice.close();
            setPhase("voiceTestSuccess");
            void (async () => {
              await speechCoordinator.speakBeforeListening({
                text: result.speechText,
                force: true,
              });
              setPhase("account");
              const accountIntro =
                Platform.OS === "ios"
                  ? ONBOARDING_SPEECH.accountIos
                  : ONBOARDING_SPEECH.accountAndroid;
              await startAccountVoiceSelection(accountIntro);
            })();
            return;
          }
        }

        const sessionEnded =
          (state.state === "error" ||
            state.state === "cancelled" ||
            state.state === "idle") &&
          ACTIVE_VOICE_STATES.has(previous.state);

        if (sessionEnded && !voiceReady.current) {
          const result = validateVoiceTestCommand(state.transcript || "");
          void appHaptics.error();
          setPhase("voiceTestError");
          useVoiceStore.getState().setVoice({
            state: "error",
            message: result.feedbackText,
            transcript: result.transcript,
            retryable: true,
            choices: [],
          });
          accessibility.announceGuidedInstruction(
            result.speechText,
            "onboarding:voiceTestError",
          );
        }
      }

      if (phase === "account" && isAccountListening.current) {
        if (state.transcript) {
          const result = validateAccountChoice(state.transcript, Platform.OS);
          if (result.valid) {
            isAccountListening.current = false;
            void appHaptics.success();
            voice.close();
            void (async () => {
              await speechCoordinator.speakBeforeListening({
                text: result.speechText,
                force: true,
              });
              const cancelMsg =
                Platform.OS === "ios"
                  ? ONBOARDING_SPEECH.accountCancelledIos
                  : ONBOARDING_SPEECH.accountCancelledAndroid;
              if (result.choice === "apple") {
                const signedIn = await account.signIn("apple");
                if (signedIn) complete();
                else {
                  accessibility.announceGuidedInstruction(cancelMsg, undefined);
                }
              } else if (result.choice === "google") {
                const signedIn = await account.signIn("google");
                if (signedIn) complete();
                else {
                  accessibility.announceGuidedInstruction(cancelMsg, undefined);
                }
              } else {
                complete();
              }
            })();
            return;
          }
        }

        const sessionEnded =
          (state.state === "error" ||
            state.state === "cancelled" ||
            state.state === "idle") &&
          ACTIVE_VOICE_STATES.has(previous.state);

        if (sessionEnded) {
          const result = validateAccountChoice(
            state.transcript || "",
            Platform.OS,
          );
          if (result.valid) {
            isAccountListening.current = false;
            void appHaptics.success();
            voice.close();
            void (async () => {
              await speechCoordinator.speakBeforeListening({
                text: result.speechText,
                force: true,
              });
              const cancelMsg =
                Platform.OS === "ios"
                  ? ONBOARDING_SPEECH.accountCancelledIos
                  : ONBOARDING_SPEECH.accountCancelledAndroid;
              if (result.choice === "apple") {
                const signedIn = await account.signIn("apple");
                if (signedIn) complete();
                else {
                  accessibility.announceGuidedInstruction(cancelMsg, undefined);
                }
              } else if (result.choice === "google") {
                const signedIn = await account.signIn("google");
                if (signedIn) complete();
                else {
                  accessibility.announceGuidedInstruction(cancelMsg, undefined);
                }
              } else {
                complete();
              }
            })();
          } else {
            isAccountListening.current = false;
            void appHaptics.error();
            voice.close();
            useVoiceStore.getState().setVoice({
              state: "error",
              message: result.feedbackText,
              transcript: result.transcript,
              retryable: true,
              choices: [],
            });
            accessibility.announceGuidedInstruction(
              result.speechText,
              "onboarding:accountError",
            );
          }
        }
      }
    });
  }, [account, complete, phase, accessibility, startAccountVoiceSelection, voice]);

  useEffect(() => {
    return useOnboardingVoiceStore.subscribe((state, previous) => {
      if (
        state.gestureEvent?.id !== previous.gestureEvent?.id &&
        state.gestureEvent
      ) {
        const mode = state.gestureEvent.mode;
        if (mode === "advanceWelcome") {
          void advanceWelcome();
        } else if (mode === "requestPermission") {
          void requestPermission();
        } else if (mode === "startVoiceTest") {
          void startVoiceTestSession();
        } else if (mode === "permissionDenied") {
          void openSettings();
        } else if (mode === "accountSelection") {
          void startAccountVoiceSelection();
        }
      }
    });
  }, [
    advanceWelcome,
    openSettings,
    requestPermission,
    startAccountVoiceSelection,
    startVoiceTestSession,
  ]);

  useEffect(() => {
    return useOnboardingVoiceStore.subscribe((state) => {
      const command = state.lastCommand;
      if (!command || command.id === lastCommandId.current) return;
      lastCommandId.current = command.id;

      if (command.type === "back") {
        if (phase === "voiceTestListening") voice.close();
        setPhase((curr) => {
          if (curr === "account") return "permissionIntro";
          if (
            curr === "permissionDenied" ||
            curr === "permissionBlocked" ||
            curr === "permissionIntro"
          )
            return "welcome";
          return "welcome";
        });
        return;
      }
      if (phase === "account" && command.type === "skip") {
        voice.close();
        complete();
        return;
      }
      if (phase === "account" && command.type === "continue") {
        voice.close();
        void account.signIn().then((signedIn) => {
          if (signedIn) complete();
        });
      }
    });
  }, [account, complete, phase, voice]);

  useEffect(() => {
    if (phase === "account" && account.profile) {
      voice.close();
      complete();
    }
  }, [account.profile, complete, phase, voice]);

  useEffect(() => {
    return () => {
      clearIdleTimers();
      onboardingVoiceBridge.setGestureMode("inactive");
      void speechCoordinator.cancel();
    };
  }, [clearIdleTimers]);

  const isStep2 =
    phase === "permissionIntro" ||
    phase === "requestingPermission" ||
    phase === "permissionDenied" ||
    phase === "permissionBlocked" ||
    phase === "voiceTestReady" ||
    phase === "voiceTestListening" ||
    phase === "voiceTestSuccess" ||
    phase === "voiceTestError";

  const screen: OnboardingScreenId =
    phase === "welcome" ? "welcome" : isStep2 ? "voiceAccess" : "account";

  return {
    screen,
    phase,
    screenReaderEnabled: accessibility.screenReaderEnabled,
    voiceState: voice.state,
    voiceMessage: voice.message,
    transcript: voice.transcript,
    deadlineAt: voice.listeningDeadlineAt,
    speechDetected: voice.speechDetected,
    advanceWelcome,
    requestPermission,
    startVoicePractice: requestPermission,
    startVoiceTest: () => startVoiceTestSession(),
    retryVoiceTest: () => startVoiceTestSession(),
    startAccountVoiceSelection,
    openSettings,
    back: () => {
      if (phase === "voiceTestListening") voice.close();
      setPhase((curr) => {
        if (curr === "account") return "permissionIntro";
        if (
          curr === "permissionDenied" ||
          curr === "permissionBlocked" ||
          curr === "permissionIntro"
        )
          return "welcome";
        return "welcome";
      });
    },
    account,
    signIn: async (provider?: AccountProvider) => {
      const signedIn = await account.signIn(provider);
      if (signedIn) complete();
    },
    skipAccount: () => complete(),
  };
}
