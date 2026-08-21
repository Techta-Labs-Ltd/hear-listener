import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
import { useRouter } from "expo-router";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { GlobalVoiceDock } from "@/components/voice/GlobalVoiceDock";
import { VoiceGestureLayer } from "@/components/voice/VoiceGestureLayer";
import { PLAYBACK_EXECUTORS, VOICE_TIMING } from "@/constants/voice";
import { entities, stories, topics } from "@/data/catalogue";
import { appHaptics } from "@/lib/haptics";
import { routes, topicRoute } from "@/navigation/routes";
import { voiceAnnounce } from "@/services/voice/announce";
import {
  confidenceBand,
  latencyBand,
  voiceDiagnostics,
} from "@/services/voice/diagnostics";
import { voiceEvents } from "@/services/voice/events";
import { voiceExecutor } from "@/services/voice/executor";
import { voiceTermRepository } from "@/services/voice/repository";
import { voiceResolver } from "@/services/voice/resolver";
import { ukSpeech } from "@/services/voice/speech";
import { speechCoordinator } from "@/services/voice/speech-coordinator";
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

import { VoiceContext, useVoice, useRegisterScreenVoice } from "./voice-context";
import { safeBack } from "@/utils/navigation";

export { VoiceContext, useVoice, useRegisterScreenVoice };

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

export function VoiceProvider({ children }: PropsWithChildren) {
  const voice = useVoiceStore();
  const router = useRouter();

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
        prev?.readout === screen.readout
      ) {
        return prev;
      }
      return screen;
    });
    return () => {
      if (activeScreenRef.current === screen) {
        activeScreenRef.current = null;
      }
      setActiveScreen((prev) => (prev === screen ? null : prev));
    };
  }, []);

  const active = useRef<ActiveVoiceSession | undefined>(undefined);
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
  const onDeviceRecognition = useRef(false);

  const finalSegments = useRef<string[]>([]);
  const currentPartial = useRef<string>("");
  const lastSpeechActivityAt = useRef<number>(0);

  const clearTimers = useCallback(() => {
    if (preSpeechTimer.current) clearTimeout(preSpeechTimer.current);
    if (noSpeechHapticTimer.current) clearTimeout(noSpeechHapticTimer.current);
    if (postSpeechSilenceTimer.current)
      clearTimeout(postSpeechSilenceTimer.current);
    if (activityWatchdogTimer.current)
      clearTimeout(activityWatchdogTimer.current);
    preSpeechTimer.current = undefined;
    noSpeechHapticTimer.current = undefined;
    postSpeechSilenceTimer.current = undefined;
    activityWatchdogTimer.current = undefined;
  }, []);

  const endSession = useCallback(
    (announce?: string) => {
      const session = active.current;
      session?.controller.abort();
      active.current = undefined;
      clearTimers();
      speechCoordinator.exitQuietMode();
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {}
      void ukSpeech.stop();
      if (session?.playbackWasPlaying) usePlaybackStore.getState().resume();
      useVoiceStore.getState().resetVoice();
      if (announce) void voiceAnnounce(announce);
    },
    [clearTimers],
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
          return "You are browsing Hear Listener. Double-tap anywhere to speak.";
        if (typeof current.readout === "function") return current.readout();
        return (
          current.readout ||
          `${current.title || "Current screen"}. Double-tap anywhere to speak.`
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
      clearTimers();
      speechCoordinator.exitQuietMode();
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {}
      useVoiceStore.getState().setVoice({
        state: "error",
        message,
        errorCode,
        retryable: true,
        choices: [],
        prompt: "",
      });
      active.current = undefined;
      if (session?.playbackWasPlaying) usePlaybackStore.getState().resume();
      void appHaptics.error();
      void voiceAnnounce(message, `voice:error:${errorCode ?? "general"}`);
    },
    [clearTimers],
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
      if (
        current?.playbackWasPlaying &&
        !PLAYBACK_EXECUTORS.has(invocation.executorKey)
      ) {
        usePlaybackStore.getState().resume();
      }

      active.current = undefined;
      useVoiceStore.getState().setVoice({
        state: "success",
        message,
        retryable: false,
        choices: [],
        prompt: "",
      });
      void appHaptics.success();
      await voiceAnnounce(message, `voice:success:${invocation.idempotencyKey}`);
      useVoiceStore.getState().resetVoice();
    },
    [finish, services],
  );

  const resolve = useCallback(
    async (id: string, hypotheses: VoiceHypothesis[]) => {
      const session = active.current;
      if (!session || session.id !== id || session.finalHandled) return;
      session.finalHandled = true;
      clearTimers();
      speechCoordinator.exitQuietMode();
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {}

      if (session.source === "onboardingPractice") {
        clearTimers();
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
        const result = await voiceResolver.resolve({
          sessionId: id,
          hypotheses,
          signal: session.controller.signal,
          context: {
            currentPath: snapshotPath,
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
          finish(
            "I could not match that command. Double-tap and try again.",
            result.reason ?? "unrecognised",
          );
        }
      } catch (error) {
        clearTimeout(timeout);
        if (!session.controller.signal.aborted) {
          finish(
            "I could not resolve that command. Double-tap to try again.",
            error instanceof Error ? error.name : "resolver-error",
          );
        }
      }
    },
    [clearTimers, execute, finish],
  );

  const beginRecognition = useCallback(
    async (id: string) => {
      const contextualStrings = await getContextualTermsSafely();
      if (active.current?.id !== id) return;

      finalSegments.current = [];
      currentPartial.current = "";
      lastSpeechActivityAt.current = 0;

      const startedAt = Date.now();
      const deadlineAt = startedAt + VOICE_TIMING.preSpeechTimeout;
      if (active.current) {
        active.current.startedAt = startedAt;
        active.current.deadlineAt = deadlineAt;
        active.current.speechDetected = false;
      }

      useVoiceStore.getState().setVoice({
        state: "listening",
        message: "Speak naturally.",
        transcript: "",
        listeningStartedAt: startedAt,
        listeningDeadlineAt: deadlineAt,
        speechDetected: false,
      });

      speechCoordinator.enterQuietMode();

      const options = buildSpeechRecognitionOptions({
        onDevice: onDeviceRecognition.current,
        contextualStrings,
      });

      try {
        ExpoSpeechRecognitionModule.start(options);
      } catch {}

      activityWatchdogTimer.current = setTimeout(() => {
        if (active.current?.id !== id) return;
        try {
          ExpoSpeechRecognitionModule.stop();
        } catch {}
        finish(
          "The listening session ended. Start a new voice command when you are ready.",
          "recognition-timeout",
        );
      }, VOICE_TIMING.recognitionActivityWatchdog);

      noSpeechHapticTimer.current = setTimeout(() => {
        if (active.current?.id !== id || active.current.speechDetected) return;
        void appHaptics.listening();
        useVoiceStore.getState().setVoice({
          message: "Still listening. 4 seconds remaining.",
        });
      }, VOICE_TIMING.noSpeechHapticReminder);

      preSpeechTimer.current = setTimeout(() => {
        if (active.current?.id !== id || active.current.speechDetected) return;
        try {
          ExpoSpeechRecognitionModule.stop();
        } catch {}
        finish(
          "I didn't hear anything. Listening is closed. Double-tap anywhere when you're ready to listen again.",
          "no-speech-timeout",
        );
      }, VOICE_TIMING.preSpeechTimeout);
    },
    [finish],
  );

  const announceListeningPrompt = useCallback(async () => {
    const screenName = activeScreenRef.current?.title || "this screen";
    await voiceAnnounce(`${copy.listeningPrompt} ${screenName}. Speak now.`);
  }, []);

  const start = useCallback(
    async (_source: VoiceInvocationSource, announceLocation = true) => {
      if (active.current) return;
      endSession();
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
        state: "permission",
        sessionId: id,
        transcript: "",
        message: "Checking microphone and speech access.",
        choices: [],
      });

      try {
        const { granted, undetermined } =
          await requestMicrophonePermissionSafely();
        if (undetermined) {
          await voiceAnnounce(copy.permissionExplain);
        }
        if (active.current?.id !== id) return;
        if (!granted) {
          finish(
            "Microphone access is off. Double-tap anywhere to open Settings.",
            "permission-denied",
          );
          return;
        }

        if (announceLocation) await announceListeningPrompt();
        if (active.current?.id !== id) return;
        await beginRecognition(id);
      } catch {
        finish(
          "On-device UK speech recognition is unavailable on this device.",
          "recognition-unavailable",
        );
      }
    },
    [announceListeningPrompt, beginRecognition, endSession, finish],
  );

  const cancel = useCallback(() => {
    endSession(copy.pausedAnnounce);
  }, [endSession]);

  const stop = useCallback(() => {
    const session = active.current;
    if (!session) return;
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {}
    const transcript = useVoiceStore.getState().transcript.trim();
    if (transcript) {
      void resolve(session.id, [{ transcript, confidence: 0.8, rank: 0 }]);
      return;
    }
    finish("I did not hear a command. Double-tap and try again.", "no-speech");
  }, [finish, resolve]);

  const close = useCallback(() => {
    endSession(
      useVoiceStore.getState().state === "success"
        ? undefined
        : copy.pausedAnnounce,
    );
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
      const startedAt = Date.now();
      const deadlineAt = startedAt + VOICE_TIMING.preSpeechTimeout;
      active.current.startedAt = startedAt;
      active.current.deadlineAt = deadlineAt;
      active.current.speechDetected = false;

      useVoiceStore.getState().setVoice({
        state: "listening",
        message: "Speak naturally.",
        listeningStartedAt: startedAt,
        listeningDeadlineAt: deadlineAt,
        speechDetected: false,
      });
      void appHaptics.listening();
    }
  });

  useSpeechRecognitionEvent("speechstart", () => {
    const session = active.current;
    if (!session) return;
    session.speechDetected = true;
    if (preSpeechTimer.current) clearTimeout(preSpeechTimer.current);
    if (noSpeechHapticTimer.current) clearTimeout(noSpeechHapticTimer.current);
    preSpeechTimer.current = undefined;
    noSpeechHapticTimer.current = undefined;
    lastSpeechActivityAt.current = Date.now();

    useVoiceStore.getState().setVoice({
      state: "listening",
      speechDetected: true,
      message: "I can hear you. Keep speaking.",
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
    if (!active.current || active.current.finalHandled) return;
    lastSpeechActivityAt.current = Date.now();
  });

  useSpeechRecognitionEvent("result", (event) => {
    const session = active.current;
    if (!session || session.controller.signal.aborted) return;

    if (!session.speechDetected) {
      session.speechDetected = true;
      if (preSpeechTimer.current) clearTimeout(preSpeechTimer.current);
      if (noSpeechHapticTimer.current) clearTimeout(noSpeechHapticTimer.current);
      preSpeechTimer.current = undefined;
      noSpeechHapticTimer.current = undefined;
    }

    lastSpeechActivityAt.current = Date.now();

    const rawTranscript = event.results[0]?.transcript?.trim() || "";
    if (rawTranscript) {
      if (event.isFinal) {
        const last = finalSegments.current[finalSegments.current.length - 1];
        if (last !== rawTranscript) {
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
        message: "I can hear you. Keep speaking.",
      });

      if (
        fullTranscript.length >= VOICE_TIMING.maxTranscriptCharacters
      ) {
        if (postSpeechSilenceTimer.current)
          clearTimeout(postSpeechSilenceTimer.current);
        void resolve(session.id, [
          { transcript: fullTranscript, confidence: 0.9, rank: 0 },
        ]);
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
        void resolve(session.id, [{ transcript: full, confidence: 0.9, rank: 0 }]);
      }
    }, VOICE_TIMING.postSpeechSilence);
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (event.error === "aborted" || !active.current) return;
    finish(
      "I could not hear that. Double-tap and try the voice command again.",
      event.error,
    );
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
      .catch(() => {});
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
        start(options?.source || "doubleTap", options?.announceLocation ?? false),
      stop,
      retry: () => start("contextualAction", false),
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
