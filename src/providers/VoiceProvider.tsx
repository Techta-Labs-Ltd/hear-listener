import { VoiceGestureLayer } from "@/components/voice/VoiceGestureLayer";
import { VoiceOverlay } from "@/components/voice/VoiceOverlay";
import { entities, stories, topics } from "@/data/catalogue";
import { appHaptics } from "@/lib/haptics";
import { voiceAnnounce } from "@/lib/voice/announce";
import {
  confidenceBand,
  latencyBand,
  voiceDiagnostics,
} from "@/lib/voice/diagnostics";
import { voiceExecutor } from "@/lib/voice/executor";
import { voiceTermRepository } from "@/lib/voice/repository";
import { voiceResolver } from "@/lib/voice/resolver";
import { buildScreenOrientation } from "@/lib/voice/screen-registry";
import { ukSpeech } from "@/lib/voice/speech";
import { speechCoordinator } from "@/lib/voice/speech-coordinator";
import { topicRoute } from "@/navigation/routes";
import { useAppAccessibility } from "@/providers/AccessibilityProvider";
import { usePlaybackStore, usePreferencesStore, useVoiceStore } from "@/stores";
import { onboardingVoiceBridge } from "@/stores/onboarding-voice-store";
import type {
  VoiceChoice,
  VoiceContextValue,
  VoiceHypothesis,
  VoiceInvocation,
  VoiceInvocationSource,
} from "@/types";
import { buildScreenReadout } from "@/utils/copy/readScreen";
import { voiceCopy as copy } from "@/utils/copy/voice";
import { usePathname, useRouter } from "expo-router";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type PropsWithChildren,
} from "react";
import { AppState, InteractionManager } from "react-native";
import { VoiceContext } from "./voice-context";

const NO_SPEECH_TIMEOUT = 8000;
const MAX_RECOGNITION_DURATION = 30000;
const RESOLUTION_TIMEOUT = 5000;
const PLAYBACK_EXECUTORS = new Set([
  "play",
  "pause",
  "resume",
  "next",
  "previous",
  "restart",
  "repeat",
  "seek",
  "speed",
  "speedStep",
]);

async function getContextualTermsSafely(): Promise<string[]> {
  try {
    return (await voiceTermRepository.getContextualTerms?.(80)) ?? [];
  } catch {
    return [];
  }
}

function sessionId() {
  return `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function VoiceProvider({ children }: PropsWithChildren) {
  const voice = useVoiceStore();
  const accessibility = useAppAccessibility();
  const preferencesHydrated = usePreferencesStore((state) => state.hydrated);
  const setupComplete = usePreferencesStore((state) => state.setupComplete);
  const spokenGuidanceEnabled = usePreferencesStore(
    (state) => state.spokenGuidanceEnabled,
  );
  const router = useRouter();
  const pathname = usePathname();
  const active = useRef<
    | {
      id: string;
      controller: AbortController;
      finalHandled: boolean;
      startedAt: number;
      speechDetected: boolean;
      playbackWasPlaying: boolean;
    }
    | undefined
  >(undefined);
  const recognitionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const noSpeechTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const clearTimers = useCallback(() => {
    if (recognitionTimer.current) clearTimeout(recognitionTimer.current);
    if (noSpeechTimer.current) clearTimeout(noSpeechTimer.current);
    recognitionTimer.current = undefined;
    noSpeechTimer.current = undefined;
  }, []);

  const endSession = useCallback(
    (announce?: string) => {
      const session = active.current;
      session?.controller.abort();
      active.current = undefined;
      clearTimers();
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch { }
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
        back: router.back,
        setDiscoverTopic: (id: string) => router.push(topicRoute(id)),
      },
      playback,
      preferences: {
        savedIds: preferences.savedIds,
        downloadedIds: preferences.downloadedIds,
        followingIds: preferences.followingIds,
        update: preferences.updatePreferences,
      },
      readScreen: () =>
        buildScreenReadout({
          pathname,
          playback: usePlaybackStore.getState(),
          preferences: usePreferencesStore.getState(),
          onboardingStep: onboardingVoiceBridge.currentStep(),
          screenReaderEnabled: accessibility.screenReaderEnabled,
        }),
      data: { stories, topics, entities },
      voiceData: {
        resetVoiceCorrections: () =>
          voiceTermRepository.resetLearnedAliases?.() ?? Promise.resolve(),
      },
    };
  }, [accessibility.screenReaderEnabled, router, pathname]);

  const finish = useCallback(
    (message: string, errorCode?: string) => {
      const session = active.current;
      session?.controller.abort();
      clearTimers();
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch { }
      useVoiceStore
        .getState()
        .setVoice({
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

  const beginRecognition = useCallback(async (id: string) => {
    const contextualStrings = await getContextualTermsSafely();
    if (active.current?.id !== id) return;
    useVoiceStore.getState().setVoice({
      state: "preparing",
      message: "Getting ready.",
    });
    ExpoSpeechRecognitionModule.start({
      lang: "en-GB",
      interimResults: true,
      continuous: false,
      maxAlternatives: 5,
      contextualStrings,
      requiresOnDeviceRecognition: true,
      addsPunctuation: false,
      iosTaskHint: "confirmation",
      iosVoiceProcessingEnabled: true,
      iosCategory: {
        category: "playAndRecord",
        categoryOptions: ["defaultToSpeaker", "allowBluetooth"],
        mode: "voiceChat",
      },
      androidIntentOptions: {
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 500,
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1400,
      },
    });
    recognitionTimer.current = setTimeout(() => {
      if (active.current?.id !== id) return;
      ExpoSpeechRecognitionModule.stop();
      finish(
        "The listening session ended. Start a new voice command when you are ready.",
        "recognition-timeout",
      );
    }, MAX_RECOGNITION_DURATION);
    noSpeechTimer.current = setTimeout(() => {
      if (active.current?.id !== id || active.current.speechDetected) return;
      ExpoSpeechRecognitionModule.stop();
      finish(
        "I did not hear a command. Try again when you are ready.",
        "no-speech-timeout",
      );
    }, NO_SPEECH_TIMEOUT);
  }, [finish]);

  const announceListeningPrompt = useCallback(async () => {
    const readout = buildScreenReadout({
      pathname,
      playback: usePlaybackStore.getState(),
      preferences: usePreferencesStore.getState(),
      onboardingStep: onboardingVoiceBridge.currentStep(),
      screenReaderEnabled: accessibility.screenReaderEnabled,
    });
    const screenName = readout.split(".")[0] || "this screen";
    await voiceAnnounce(`${copy.listeningPrompt} ${screenName}. Speak now.`);
  }, [accessibility.screenReaderEnabled, pathname]);

  const start = useCallback(
    async (_source: VoiceInvocationSource, announceLocation = true) => {
      if (active.current) return;
      endSession();
      await ukSpeech.stop();
      const playback = usePlaybackStore.getState();
      const playbackWasPlaying = playback.playing;
      if (playbackWasPlaying) playback.pause();
      const id = sessionId();
      const controller = new AbortController();
      active.current = {
        id,
        controller,
        finalHandled: false,
        startedAt: Date.now(),
        speechDetected: false,
        playbackWasPlaying,
      };
      useVoiceStore.getState().setVoice({
        state: "permission",
        sessionId: id,
        transcript: "",
        message: "Checking microphone and speech access.",
        choices: [],
      });
      try {
        try {
          const existing =
            await ExpoSpeechRecognitionModule.getPermissionsAsync();
          if (existing?.status === "undetermined") {
            await voiceAnnounce(copy.permissionExplain);
          }
        } catch { }
        const permission =
          await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (active.current?.id !== id) return;
        if (!permission.granted) {
          finish(
            "Microphone and speech access are needed only while you use voice control.",
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
        finish(
          "That action could not be completed.",
          result.errorCode,
        );
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
        if (kind && target)
          await voiceTermRepository.learnAlias(
            alias,
            canonical ?? String(target),
            kind,
            String(target),
          );
      }
      const message = result.feedback ?? "Done";
      if (
        current?.playbackWasPlaying &&
        !PLAYBACK_EXECUTORS.has(invocation.executorKey)
      )
        usePlaybackStore.getState().resume();
      active.current = undefined;
      useVoiceStore
        .getState()
        .setVoice({
          state: "success",
          message,
          retryable: false,
          choices: [],
          prompt: "",
        });
      void appHaptics.success();
      await voiceAnnounce(message, `voice:success:${invocation.idempotencyKey}`);
      if (pathname !== "/onboarding") useVoiceStore.getState().resetVoice();
    },
    [finish, pathname, services],
  );

  const resolve = useCallback(
    async (id: string, hypotheses: VoiceHypothesis[]) => {
      const session = active.current;
      if (!session || session.id !== id || session.finalHandled) return;
      session.finalHandled = true;
      clearTimers();
      ExpoSpeechRecognitionModule.stop();
      useVoiceStore.getState().setVoice({
        state: "resolving",
        transcript: hypotheses[0]?.transcript ?? "",
        message: "Finding the best match.",
      });
      const timeout = setTimeout(() => {
        session.controller.abort();
        if (active.current?.id === id)
          finish(
            "That command took too long to resolve. Try again.",
            "resolution-timeout",
          );
      }, RESOLUTION_TIMEOUT);
      const started = Date.now();
      try {
        const preferences = usePreferencesStore.getState();
        const result = await voiceResolver.resolve({
          sessionId: id,
          hypotheses,
          signal: session.controller.signal,
          context: {
            currentPath: pathname,
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
            databaseVersion: result.invocation.databaseVersion,
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
        } else if (result.kind !== "cancelled")
          finish(
            "I could not match that command. Double-tap and try again.",
            result.reason ?? "unrecognised",
          );
      } catch (error) {
        clearTimeout(timeout);
        if (!session.controller.signal.aborted)
          finish(
            "I could not resolve that command. Try again.",
            error instanceof Error ? error.name : "resolver-error",
          );
      }
    },
    [clearTimers, execute, finish, pathname],
  );

  const cancel = useCallback(() => {
    endSession(copy.pausedAnnounce);
  }, [endSession]);
  const stop = useCallback(() => {
    const session = active.current;
    if (!session) return;
    ExpoSpeechRecognitionModule.stop();
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
      if (choice.invocation)
        await execute(choice.invocation, choice.alias, choice.label);
    },
    [execute],
  );

  useSpeechRecognitionEvent("start", () => {
    if (active.current) {
      useVoiceStore
        .getState()
        .setVoice({ state: "listening", message: "Listening. Speak now." });
      void appHaptics.listening();
    }
  });
  useSpeechRecognitionEvent("speechstart", () => {
    const session = active.current;
    if (!session) return;
    session.speechDetected = true;
    if (noSpeechTimer.current) clearTimeout(noSpeechTimer.current);
    noSpeechTimer.current = undefined;
    useVoiceStore.getState().setVoice({
      state: "listening",
      message: "I can hear you. Keep speaking.",
    });
  });
  useSpeechRecognitionEvent("speechend", () => {
    if (!active.current || active.current.finalHandled) return;
    useVoiceStore.getState().setVoice({
      state: "listening",
      message: "Thanks. Finishing your command.",
    });
  });
  useSpeechRecognitionEvent("result", (event) => {
    const session = active.current;
    if (!session || session.controller.signal.aborted) return;
    const hypotheses = event.results
      .map((item, rank) => ({
        transcript: item.transcript,
        confidence: item.confidence,
        rank,
      }))
      .filter((item) => !!item.transcript);
    if (hypotheses[0])
      useVoiceStore
        .getState()
        .setVoice({ transcript: hypotheses[0].transcript });
    if (event.isFinal && hypotheses.length)
      void resolve(session.id, hypotheses);
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
        if (health && !health.healthy)
          useVoiceStore.getState().setVoice({
            state: "error",
            message: "The voice database needs to be restored.",
          });
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
    if (pathname === "/onboarding") return;
    if (!preferencesHydrated || !setupComplete) return;
    if (!accessibility.screenReaderEnabled && !spokenGuidanceEnabled) return;

    const task = InteractionManager.runAfterInteractions(() => {
      const context = {
        pathname,
        playback: usePlaybackStore.getState(),
        preferences: usePreferencesStore.getState(),
        screenReaderEnabled: accessibility.screenReaderEnabled,
      };
      void speechCoordinator.cancel("screen:").then(() => {
        accessibility.announce(
          buildScreenOrientation(context),
          `screen:${pathname}`,
        );
      });
    });
    return () => task.cancel();
  }, [
    accessibility,
    pathname,
    preferencesHydrated,
    setupComplete,
    spokenGuidanceEnabled,
  ]);
  useEffect(() => () => endSession(), [endSession]);

  const value = useMemo<VoiceContextValue>(
    () => ({
      ...voice,
      startVoiceSession: ({ source }) => start(source, true),
      stop,
      retry: () => start("contextualAction", true),
      cancel,
      close,
      choose,
    }),
    [voice, start, stop, cancel, close, choose],
  );
  return (
    <VoiceContext.Provider value={value}>
      <VoiceGestureLayer>{children}</VoiceGestureLayer>
      <VoiceOverlay />
    </VoiceContext.Provider>
  );
}
