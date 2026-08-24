import { GlobalVoiceDock } from "@/components/voice/GlobalVoiceDock";
import { VoiceGestureLayer } from "@/components/voice/VoiceGestureLayer";
import { PLAYBACK_EXECUTORS, VOICE_TIMING } from "@/constants/voice";
import { entities, stories, topics } from "@/data/catalogue";
import { playListeningStartTone } from "@/lib/audio/one-shots";
import { appHaptics } from "@/lib/haptics";
import { routes, topicRoute } from "@/navigation/routes";
import { useAppAccessibility } from "@/providers/AccessibilityProvider";
import { speechCoordinator, voiceAnnounce } from "@/services/voice/speech-coordinator";
import {
  confidenceBand,
  latencyBand,
  voiceDiagnostics,
} from "@/services/voice/diagnostics";
import { voiceEvents } from "@/services/voice/events";
import { voiceExecutor } from "@/services/voice/executor";
import { voiceTermRepository } from "@/services/voice/repository";
import { voiceResolver } from "@/services/voice/resolver";
import { externalVoiceResolver } from "@/services/voice/external-resolver";
import { ukSpeech } from "@/services/voice/speech";
import { usePlaybackStore, usePreferencesStore, useVoiceStore } from "@/stores";
import type {
  ActiveVoiceSession,
  ScreenVoiceContext,
  VoiceChoice,
  VoiceContextValue,
  VoiceHypothesis,
  VoiceInvocation,
  VoiceInvocationSource,
} from "@/types";
import { voiceCopy as copy } from "@/utils/copy/voice";
import {
  buildSpeechRecognitionOptions,
  generateVoiceSessionId,
  isSpeechRecognitionSupported,
  requestMicrophonePermissionSafely,
  supportsOnDeviceSpeechRecognition,
} from "@/utils/voice";
import { useRouter } from "expo-router";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";

import { safeBack } from "@/utils/navigation";
import { VoiceContext, useRegisterScreenVoice, useVoice } from "./voice-context";

export { VoiceContext, useRegisterScreenVoice, useVoice };

async function getContextualTermsSafely(): Promise<string[]> {
  try {
    return (
      (await voiceTermRepository.getContextualTerms?.(
        VOICE_TIMING.contextualTermsLimit,
      )) ?? []
    );
  } catch {
    return [];
  }
}

function overlapAwareAppend(existing: string, incoming: string): boolean {
  const existingTokens = existing.toLowerCase().split(/\s+/).filter(Boolean);
  const incomingTokens = incoming.toLowerCase().split(/\s+/).filter(Boolean);
  if (incomingTokens.length === 0) return true;
  if (existingTokens.length === 0) return false;

  const maxOverlap = Math.min(existingTokens.length, incomingTokens.length);
  for (let overlapLength = maxOverlap; overlapLength > 0; overlapLength--) {
    const existingSuffix = existingTokens.slice(-overlapLength);
    const incomingPrefix = incomingTokens.slice(0, overlapLength);
    if (existingSuffix.join(" ") === incomingPrefix.join(" ")) {
      const newTokens = incomingTokens.slice(overlapLength);
      if (newTokens.length > 0) {
        existingTokens.push(...newTokens);
        return true;
      }
      return true;
    }
  }
  return false;
}

export function VoiceProvider({ children }: PropsWithChildren) {
  const voice = useVoiceStore();
  const router = useRouter();
  const accessibility = useAppAccessibility();

  const [activeScreen, setActiveScreen] = useState<ScreenVoiceContext | null>(
    null,
  );
  const activeScreenRef = useRef<ScreenVoiceContext | null>(null);
  activeScreenRef.current = activeScreen;

  const registerScreen = useCallback((screen: ScreenVoiceContext) => {
    activeScreenRef.current = screen;
    setActiveScreen((prev) => {
      if (
        prev?.id === screen.id &&
        prev?.pathname === screen.pathname &&
        prev?.title === screen.title &&
        prev?.orientation === screen.orientation &&
        prev?.readout === screen.readout &&
        JSON.stringify(prev?.commands) === JSON.stringify(screen.commands)
      ) {
        return prev;
      }
      return screen;
    });
    return () => {
      if (
        activeScreenRef.current?.pathname === screen.pathname &&
        activeScreenRef.current?.id === screen.id
      ) {
        activeScreenRef.current = null;
      }
      setActiveScreen((prev) =>
        prev?.pathname === screen.pathname && prev?.id === screen.id
          ? null
          : prev,
      );
    };
  }, []);

  const active = useRef<ActiveVoiceSession | undefined>(undefined);
  const microphoneClosed = useRef(true);
  const preSpeechTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const noSpeechHapticTimer = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);
  const postSpeechSilenceTimer = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);
  const activityWatchdogTimer = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);
  const asrStartTimeoutTimer = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);
  const asrStopWaitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const onDeviceRecognition = useRef(false);

  const finalSegments = useRef<string[]>([]);
  const currentPartial = useRef<string>("");
  const lastSpeechActivityAt = useRef<number>(0);

  const clearTimersInternal = () => {
    if (preSpeechTimer.current) clearTimeout(preSpeechTimer.current);
    if (noSpeechHapticTimer.current) clearTimeout(noSpeechHapticTimer.current);
    if (postSpeechSilenceTimer.current)
      clearTimeout(postSpeechSilenceTimer.current);
    if (activityWatchdogTimer.current)
      clearTimeout(activityWatchdogTimer.current);
    if (asrStartTimeoutTimer.current) clearTimeout(asrStartTimeoutTimer.current);
    if (asrStopWaitTimer.current) clearTimeout(asrStopWaitTimer.current);
    preSpeechTimer.current = undefined;
    noSpeechHapticTimer.current = undefined;
    postSpeechSilenceTimer.current = undefined;
    activityWatchdogTimer.current = undefined;
    asrStartTimeoutTimer.current = undefined;
    asrStopWaitTimer.current = undefined;
  };

  const clearTimers = useCallback(() => {
    clearTimersInternal();
  }, []);

  const waitForMicrophoneClose = useCallback(
    async (timeoutMs = 1500): Promise<void> => {
      if (microphoneClosed.current) return;
      return new Promise((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          if (asrStopWaitTimer.current) clearTimeout(asrStopWaitTimer.current);
          asrStopWaitTimer.current = undefined;
          resolve();
        };
        microphoneCloseResolvers.current.add(done);
        asrStopWaitTimer.current = setTimeout(() => {
          microphoneClosed.current = true;
          done();
        }, timeoutMs);
      });
    },
    [],
  );

  const microphoneCloseResolvers = useRef(new Set<() => void>());

  const endSession = useCallback(
    (announce?: string) => {
      const session = active.current;
      session?.controller.abort();
      active.current = undefined;
      clearTimers();
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch { }
      microphoneClosed.current = false;
      void waitForMicrophoneClose().then(() => {
        speechCoordinator.exitQuietMode();
        if (announce) void voiceAnnounce(announce);
      });
      void ukSpeech.stop();
      useVoiceStore.getState().resetVoice();
    },
    [clearTimers, waitForMicrophoneClose],
  );

  const services = useCallback(() => {
    const playback = usePlaybackStore.getState();
    const preferences = usePreferencesStore.getState();
    return {
      navigate: {
        replace: router.replace,
        push: router.push,
        back: () => safeBack(router, routes.home),
        setDiscoverTopic: (id: string) => router.push(topicRoute(id)),
      },
      playback,
      preferences: {
        savedIds: preferences.savedIds,
        downloadedIds: preferences.downloadedIds,
        followingIds: preferences.followingIds,
        update: preferences.updatePreferences,
      },
      readScreen: () => {
        const current = activeScreenRef.current;
        if (!current)
          return "You are browsing Hear Listener. Shake device to speak.";
        if (typeof current.readout === "function") return current.readout();
        return (
          current.readout ||
          `${current.title || "Current screen"}. Shake device to speak.`
        );
      },
      data: { stories, topics, entities },
      voiceData: {
        resetVoiceCorrections: () =>
          voiceTermRepository.resetLearnedAliases?.() ?? Promise.resolve(),
      },
    };
  }, [router]);

  const finish = useCallback(
    (message: string, errorCode?: string) => {
      const session = active.current;
      session?.controller.abort();
      active.current = undefined;
      clearTimers();
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch { }
      microphoneClosed.current = false;
      useVoiceStore.getState().setVoice({
        state: "error",
        message,
        errorCode,
        retryable: true,
        choices: [],
        prompt: "",
      });
      void waitForMicrophoneClose().then(() => {
        speechCoordinator.exitQuietMode();
        if (session?.playbackWasPlaying) usePlaybackStore.getState().resume();
        void appHaptics.error();
        if (session?.source !== "onboardingPractice") {
          void voiceAnnounce(message, `voice:error:${errorCode ?? "general"}`);
        }
      });
    },
    [clearTimers, waitForMicrophoneClose],
  );

  const finishWithoutResume = useCallback(
    (message: string, errorCode?: string) => {
      const session = active.current;
      session?.controller.abort();
      clearTimers();
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch { }
      microphoneClosed.current = false;
      useVoiceStore.getState().setVoice({
        state: "error",
        message,
        errorCode,
        retryable: true,
        choices: [],
        prompt: "",
      });
      active.current = undefined;
      void waitForMicrophoneClose().then(() => {
        speechCoordinator.exitQuietMode();
        void appHaptics.error();
        if (session?.source !== "onboardingPractice") {
          void voiceAnnounce(message, `voice:error:${errorCode ?? "general"}`);
        }
      });
    },
    [clearTimers, waitForMicrophoneClose],
  );

  const execute = useCallback(
    async (invocation: VoiceInvocation, alias?: string, canonical?: string) => {
      const current = active.current;
      if (current && current.id !== invocation.recognitionSessionId) return;

      useVoiceStore
        .getState()
        .setVoice({ state: "executing", message: "Working on that." });

      const result = await voiceExecutor.execute(invocation, services());
      if (!result.ok) {
        if (result.errorCode === "duplicate") return;
        finish("That action could not be completed.", result.errorCode);
        return;
      }

      if (alias) {
        const target =
          invocation.slots.storyId ??
          invocation.slots.locationId ??
          invocation.slots.topicId ??
          invocation.slots.entityId;
        const kind = invocation.slots.storyId
          ? "story"
          : invocation.slots.locationId
            ? "location"
            : invocation.slots.topicId
              ? "topic"
              : invocation.slots.entityId
                ? "entity"
                : undefined;
        if (kind && target) {
          await voiceTermRepository.learnAlias(
            alias,
            canonical ?? String(target),
            kind,
            String(target),
          );
        }
      }

      const message = result.feedback ?? "Done";
      active.current = undefined;
      useVoiceStore.getState().setVoice({
        state: "success",
        message,
        retryable: false,
        choices: [],
        prompt: "",
      });
      void appHaptics.success();
      speechCoordinator.exitQuietMode();
      await voiceAnnounce(message, `voice:success:${invocation.idempotencyKey}`);

      if (
        current?.playbackWasPlaying &&
        !PLAYBACK_EXECUTORS.has(invocation.executorKey)
      ) {
        usePlaybackStore.getState().resume();
      }

      if (
        invocation.executorKey === "navigate" ||
        invocation.executorKey.startsWith("open") ||
        invocation.executorKey.startsWith("onboarding")
      ) {
        useVoiceStore.getState().resetVoice();
      } else {
        await new Promise<void>((resolve) => setTimeout(resolve, 1400));
        useVoiceStore.getState().resetVoice();
      }
    },
    [finish, services],
  );

  const resolve = useCallback(
    async (id: string, hypotheses: VoiceHypothesis[]) => {
      const session = active.current;
      if (!session || session.id !== id || session.finalHandled) return;
      session.finalHandled = true;
      clearTimers();
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch { }
      microphoneClosed.current = false;

      if (session.source === "onboardingPractice") {
        await waitForMicrophoneClose();
        speechCoordinator.exitQuietMode();
        active.current = undefined;
        const transcript = hypotheses[0]?.transcript?.trim() ?? "";
        useVoiceStore.getState().setVoice({
          state: "idle",
          transcript,
        });
        return;
      }

      useVoiceStore.getState().setVoice({
        state: "resolving",
        transcript: hypotheses[0]?.transcript ?? "",
        message: "Finding the best match.",
      });

      try {
        await waitForMicrophoneClose();
      } catch { }

      if (active.current?.id !== id) return;
      speechCoordinator.exitQuietMode();

      useVoiceStore.getState().setVoice({
        state: "resolving",
        transcript: hypotheses[0]?.transcript ?? "",
        message: "Finding the best match.",
      });

      const timeout = setTimeout(() => {
        session.controller.abort();
        if (active.current?.id === id) {
          finish(
            "That command took too long to resolve. Try again.",
            "resolution-timeout",
          );
        }
      }, VOICE_TIMING.resolutionTimeout);

      const started = Date.now();
      try {
        const preferences = usePreferencesStore.getState();
        const snapshotPath =
          session.screenSnapshot?.pathname ??
          activeScreenRef.current?.pathname ??
          activeScreenRef.current?.title;
        const playback = usePlaybackStore.getState();
        const screenId =
          session.screenSnapshot?.id ??
          activeScreenRef.current?.id ??
          "unknown";
        const result = await voiceResolver.resolve({
          sessionId: id,
          hypotheses,
          signal: session.controller.signal,
          context: {
            screenId,
            currentPath: snapshotPath,
            pathname: snapshotPath ?? "",
            screenState: session.screenSnapshot?.screenState,
            activeContent: playback.current
              ? {
                id: playback.current.id,
                type: "story" as const,
                title: playback.current.title,
              }
              : undefined,
            playback: {
              playing: playback.playing,
              contentId: playback.current?.id,
              title: playback.current?.title,
            },
            preferences,
            stories,
            topics,
            entities,
          },
        });
        clearTimeout(timeout);
        if (active.current?.id !== id || session.controller.signal.aborted)
          return;

        if (result.kind === "invocation") {
          await voiceDiagnostics.record({
            timestamp: Date.now(),
            outcome: "success",
            latencyBand: latencyBand(Date.now() - started),
            confidenceBand: confidenceBand(result.invocation.confidence),
            actionId: result.invocation.actionId,
            databaseVersion:
              typeof result.invocation.databaseVersion === "number"
                ? result.invocation.databaseVersion
                : 1,
          });
          await execute(result.invocation);
        } else if (result.kind === "choices") {
          useVoiceStore.getState().setVoice({
            state: "clarifying",
            prompt: result.prompt,
            message: result.prompt,
            choices: result.choices,
          });
          void appHaptics.clarification();
          await voiceDiagnostics.record({
            timestamp: Date.now(),
            outcome: "clarification",
            latencyBand: latencyBand(Date.now() - started),
            confidenceBand: confidenceBand(result.confidence),
          });
          void voiceAnnounce(result.prompt);
        } else if (result.kind !== "cancelled") {
          useVoiceStore.getState().setVoice({ externalResolving: true });
          const externalResult = await externalVoiceResolver.resolve({
            transcript: hypotheses[0]?.transcript ?? "",
            screenContext: {
              pathname: snapshotPath ?? "",
              playback: {
                current: playback.current,
                playing: playback.playing,
                progress: playback.progress,
                speed: playback.speed,
              },
              preferences,
            },
            appSummary: {
              currentPath: snapshotPath ?? "",
              playingTitle: playback.current?.title,
              isPlaying: playback.playing,
            },
          });
          useVoiceStore.getState().setVoice({ externalResolving: false });

          if (externalResult.handled && externalResult.spokenResponse) {
            finish(externalResult.spokenResponse, "success");
          } else {
            finish(
              "I could not match that command. Shake device to try again.",
              result.reason ?? "unrecognised",
            );
          }
        }
      } catch (error) {
        clearTimeout(timeout);
        if (!session.controller.signal.aborted) {
          finish(
            "I could not resolve that command. Shake device to try again.",
            error instanceof Error ? error.name : "resolver-error",
          );
        }
      }
    },
    [clearTimers, execute, finish, waitForMicrophoneClose],
  );

  const resetActivityWatchdog = useCallback(
    (id: string) => {
      if (activityWatchdogTimer.current)
        clearTimeout(activityWatchdogTimer.current);
      activityWatchdogTimer.current = setTimeout(() => {
        const session = active.current;
        if (!session || session.id !== id) return;
        try {
          ExpoSpeechRecognitionModule.stop();
        } catch { }
        finish(
          "The listening session ended. Start a new voice command when you are ready.",
          "recognition-timeout",
        );
      }, VOICE_TIMING.recognitionActivityWatchdog);
    },
    [finish],
  );

  const beginRecognition = useCallback(
    async (id: string) => {
      const contextualStrings = await getContextualTermsSafely();
      if (active.current?.id !== id) return;

      finalSegments.current = [];
      currentPartial.current = "";
      lastSpeechActivityAt.current = 0;

      speechCoordinator.enterQuietMode();

      const options = buildSpeechRecognitionOptions({
        onDevice: onDeviceRecognition.current,
        contextualStrings,
      });

      try {
        await ExpoSpeechRecognitionModule.start(options);
      } catch { }

      asrStartTimeoutTimer.current = setTimeout(() => {
        if (active.current?.id !== id || active.current.asrConfirmed) return;
        finishWithoutResume(
          "I couldn't start voice recognition. Shake device to try again.",
          "asr-start-failed",
        );
      }, 6000);

      resetActivityWatchdog(id);

    },
    [finish, finishWithoutResume, resetActivityWatchdog],
  );

  const announceListeningPrompt = useCallback(async () => {
    const screenName = activeScreenRef.current?.title || "this screen";
    await voiceAnnounce(`${copy.listeningPrompt} ${screenName}. Speak now.`);
  }, []);

  const start = useCallback(
    async (_source: VoiceInvocationSource, announceLocation = true) => {
      if (active.current) {
        endSession();
      }
      await ukSpeech.stop();
      const playback = usePlaybackStore.getState();
      const playbackWasPlaying = playback.playing;
      if (playbackWasPlaying) playback.pause();

      const id = generateVoiceSessionId();
      const controller = new AbortController();
      const screenSnapshot = activeScreenRef.current;
      const startedAt = Date.now();
      active.current = {
        id,
        controller,
        finalHandled: false,
        asrConfirmed: false,
        startedAt,
        deadlineAt: startedAt + VOICE_TIMING.preSpeechTimeout,
        speechDetected: false,
        playbackWasPlaying,
        source: _source,
        screenSnapshot: screenSnapshot ? { ...screenSnapshot } : null,
      };

      const supported = await isSpeechRecognitionSupported();
      if (active.current?.id !== id) return;
      if (!supported) {
        finish(
          "Voice isn't supported on this device. You can still browse and listen by touch.",
          "service-not-allowed",
        );
        return;
      }

      onDeviceRecognition.current = supportsOnDeviceSpeechRecognition();

      useVoiceStore.getState().setVoice({
        state: "preparing",
        sessionId: id,
        transcript: "",
        message: "Getting ready…",
        choices: [],
      });

      try {
        const { granted, undetermined } =
          await requestMicrophonePermissionSafely();
        if (undetermined) {
          speechCoordinator.exitQuietMode();
          await voiceAnnounce(copy.permissionExplain);
        }
        if (active.current?.id !== id) return;
        if (!granted) {
          finishWithoutResume(
            "Microphone access is off. Open Settings to enable microphone.",
            "permission-denied",
          );
          return;
        }

        if (announceLocation) {
          speechCoordinator.exitQuietMode();
          await announceListeningPrompt();
        }
        if (active.current?.id !== id) return;

        await beginRecognition(id);
      } catch {
        finish(
          "On-device UK speech recognition is unavailable on this device.",
          "recognition-unavailable",
        );
      }
    },
    [announceListeningPrompt, beginRecognition, endSession, finish, finishWithoutResume],
  );

  const cancel = useCallback(() => {
    endSession();
  }, [endSession]);

  const stop = useCallback(() => {
    const session = active.current;
    if (!session) return;
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch { }
    const transcript = useVoiceStore.getState().transcript.trim();
    if (transcript) {
      void resolve(session.id, [{ transcript, confidence: 0.8, rank: 0 }]);
      return;
    }
    finish("I did not hear a command. Shake device to try again.", "no-speech");
  }, [finish, resolve]);

  const close = useCallback(() => {
    endSession();
  }, [endSession]);

  const choose = useCallback(
    async (choice: VoiceChoice) => {
      if (choice.invocation) {
        await execute(choice.invocation, choice.alias, choice.label);
      }
    },
    [execute],
  );

  useSpeechRecognitionEvent("start", () => {
    if (active.current) {
      active.current.asrConfirmed = true;
      if (asrStartTimeoutTimer.current) clearTimeout(asrStartTimeoutTimer.current);
      asrStartTimeoutTimer.current = undefined;

      const startedAt = Date.now();
      const deadlineAt = startedAt + VOICE_TIMING.preSpeechTimeout;
      active.current.startedAt = startedAt;
      active.current.deadlineAt = deadlineAt;
      active.current.speechDetected = false;

      useVoiceStore.getState().setVoice({
        state: "listening",
        message: "Speak now.",
        listeningStartedAt: startedAt,
        listeningDeadlineAt: deadlineAt,
        speechDetected: false,
      });
      void playListeningStartTone();
      void appHaptics.listening();

      noSpeechHapticTimer.current = setTimeout(() => {
        if (active.current?.speechDetected || active.current?.controller.signal.aborted) return;
        void appHaptics.listening();
        useVoiceStore.getState().setVoice({
          message: "Still listening. 4 seconds remaining.",
        });
      }, VOICE_TIMING.noSpeechHapticReminder);

      preSpeechTimer.current = setTimeout(() => {
        if (active.current?.speechDetected || active.current?.controller.signal.aborted) return;
        try {
          ExpoSpeechRecognitionModule.stop();
        } catch { }
        finish(
          "I didn't hear anything. Listening is closed. Shake device when you're ready to speak again.",
          "no-speech-timeout",
        );
      }, VOICE_TIMING.preSpeechTimeout);
    }
  });

  useSpeechRecognitionEvent("end", () => {
    microphoneClosed.current = true;
    const resolvers = Array.from(microphoneCloseResolvers.current);
    microphoneCloseResolvers.current.clear();
    for (const resolveFn of resolvers) {
      try {
        resolveFn();
      } catch { }
    }

    const session = active.current;
    if (session && !session.finalHandled && !session.controller.signal.aborted) {
      const full = [...finalSegments.current, currentPartial.current]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" ");
      if (full) {
        if (postSpeechSilenceTimer.current)
          clearTimeout(postSpeechSilenceTimer.current);
        void resolve(session.id, [{ transcript: full, confidence: 0.85, rank: 0 }]);
      } else {
        finish(
          "I didn't hear anything. Listening is closed. Shake device when you're ready to speak again.",
          "no-speech",
        );
      }
    }
  });

  useSpeechRecognitionEvent("speechstart", () => {
    const session = active.current;
    if (!session) return;
    session.speechDetected = true;
    resetActivityWatchdog(session.id);
    if (preSpeechTimer.current) clearTimeout(preSpeechTimer.current);
    if (noSpeechHapticTimer.current) clearTimeout(noSpeechHapticTimer.current);
    preSpeechTimer.current = undefined;
    noSpeechHapticTimer.current = undefined;
    lastSpeechActivityAt.current = Date.now();

    useVoiceStore.getState().setVoice({
      state: "listening",
      speechDetected: true,
      message: "Listening…",
    });

    if (postSpeechSilenceTimer.current)
      clearTimeout(postSpeechSilenceTimer.current);
    postSpeechSilenceTimer.current = setTimeout(() => {
      const full = [...finalSegments.current, currentPartial.current]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" ");
      if (full && active.current?.id === session.id) {
        void resolve(session.id, [{ transcript: full, confidence: 0.9, rank: 0 }]);
      }
    }, VOICE_TIMING.postSpeechSilence);
  });

  useSpeechRecognitionEvent("speechend", () => {
    const session = active.current;
    if (!session || session.finalHandled) return;
    lastSpeechActivityAt.current = Date.now();

    useVoiceStore.getState().setVoice({
      state: "listening",
      speechDetected: true,
      message: "Listening…",
    });

    if (postSpeechSilenceTimer.current)
      clearTimeout(postSpeechSilenceTimer.current);
    postSpeechSilenceTimer.current = setTimeout(() => {
      const full = [...finalSegments.current, currentPartial.current]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" ");
      if (full && active.current?.id === session.id) {
        void resolve(session.id, [{ transcript: full, confidence: 0.9, rank: 0 }]);
      }
    }, VOICE_TIMING.postSpeechSilence);
  });

  useSpeechRecognitionEvent("result", (event) => {
    const session = active.current;
    if (!session || session.controller.signal.aborted) return;

    if (session.speechDetected) {
      resetActivityWatchdog(session.id);
    }

    if (!session.speechDetected) {
      session.speechDetected = true;
      if (preSpeechTimer.current) clearTimeout(preSpeechTimer.current);
      if (noSpeechHapticTimer.current) clearTimeout(noSpeechHapticTimer.current);
      preSpeechTimer.current = undefined;
      noSpeechHapticTimer.current = undefined;
    }

    lastSpeechActivityAt.current = Date.now();

    const hypotheses = event.results
      .map((item, rank) => ({
        transcript: item.transcript?.trim() ?? "",
        confidence: typeof item.confidence === "number" ? item.confidence : 0.8,
        rank,
      }))
      .filter((item) => Boolean(item.transcript));

    const rawTranscript = hypotheses[0]?.transcript ?? "";
    if (rawTranscript) {
      if (event.isFinal) {
        const last = finalSegments.current[finalSegments.current.length - 1];
        if (!last || !overlapAwareAppend(last, rawTranscript)) {
          finalSegments.current.push(rawTranscript);
        }
        currentPartial.current = "";
      } else {
        currentPartial.current = rawTranscript;
      }

      const fullTranscript = [
        ...finalSegments.current,
        currentPartial.current,
      ]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" ");

      useVoiceStore.getState().setVoice({
        transcript: fullTranscript,
        speechDetected: true,
        message: "Listening…",
      });

      if (
        event.isFinal ||
        fullTranscript.length >= VOICE_TIMING.maxTranscriptCharacters
      ) {
        if (postSpeechSilenceTimer.current)
          clearTimeout(postSpeechSilenceTimer.current);
        const resolvedHypotheses = hypotheses.map((h, i) =>
          i === 0 ? { ...h, transcript: fullTranscript } : h,
        );
        if (resolvedHypotheses.length === 0) {
          resolvedHypotheses.push({
            transcript: fullTranscript,
            confidence: 0.85,
            rank: 0,
          });
        }
        void resolve(session.id, resolvedHypotheses);
        return;
      }
    }

    if (postSpeechSilenceTimer.current)
      clearTimeout(postSpeechSilenceTimer.current);
    postSpeechSilenceTimer.current = setTimeout(() => {
      const full = [...finalSegments.current, currentPartial.current]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" ");
      if (full && active.current?.id === session.id) {
        const resolvedHypotheses = hypotheses.map((h, i) =>
          i === 0 ? { ...h, transcript: full } : h,
        );
        if (resolvedHypotheses.length === 0) {
          resolvedHypotheses.push({
            transcript: full,
            confidence: 0.85,
            rank: 0,
          });
        }
        void resolve(session.id, resolvedHypotheses);
      }
    }, VOICE_TIMING.postSpeechSilence);
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (event.error === "aborted" || !active.current) return;
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {}
    const errorCode = event.error;
    let message =
      "I could not hear that. Shake device and try the voice command again.";
    if (errorCode === "service-not-allowed" || errorCode === "not-allowed") {
      finishWithoutResume(
        "Microphone access is off. Open Settings to enable microphone.",
        "permission-denied",
      );
      return;
    } else if (errorCode === "audio-capture") {
      message = "Microphone capture failed. Please check your microphone.";
    } else if (errorCode === "network") {
      message =
        "Network error during speech recognition. Please check your connection.";
    }
    finish(message, errorCode);
  });

  useEffect(() => {
    void voiceTermRepository
      .initialize()
      .then(() => voiceTermRepository.healthCheck?.())
      .then((health) => {
        if (health && !health.healthy) {
          useVoiceStore.getState().setVoice({
            state: "error",
            message: "The voice database needs to be restored.",
          });
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" && active.current) endSession();
    });
    return () => sub.remove();
  }, [endSession]);

  useEffect(() => {
    return voiceEvents.subscribe(
      ({ source, announceLocation }: { source?: VoiceInvocationSource; announceLocation?: boolean }) => {
        void start(source || "eventTrigger", announceLocation ?? true);
      },
    );
  }, [start]);

  useEffect(() => () => endSession(), [endSession]);

  const value = useMemo<VoiceContextValue>(
    () => ({
      ...voice,
      activeScreen,
      registerScreen,
      startVoiceSession: (options) =>
        start(options?.source || "shakeGesture", options?.announceLocation ?? true),
      stop,
      retry: () => start("contextualAction", true),
      cancel,
      close,
      choose,
    }),
    [
      voice,
      activeScreen,
      registerScreen,
      start,
      stop,
      cancel,
      close,
      choose,
    ],
  );

  return (
    <VoiceContext.Provider value={value}>
      <VoiceGestureLayer>
        {children}
        <GlobalVoiceDock />
      </VoiceGestureLayer>
    </VoiceContext.Provider>
  );
}
