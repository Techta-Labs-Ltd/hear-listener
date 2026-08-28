import { GlobalVoiceDock } from "@/components/voice/GlobalVoiceDock";
import { VoiceGestureLayer } from "@/components/voice/VoiceGestureLayer";
import { EXTERNAL_VOICE_CONFIG } from "@/constants/external-voice";
import {
  PLAYBACK_EXECUTORS,
  VOICE_LANGUAGE,
  VOICE_TIMING,
} from "@/constants/voice";
import { playListeningStartTone } from "@/lib/audio/one-shots";
import { appHaptics } from "@/lib/haptics";
import { routes, topicRoute } from "@/navigation/routes";
import { speechCoordinator, voiceAnnounce } from "@/services/voice/speech-coordinator";
import { voiceDiagnostics } from "@/services/voice/diagnostics";
import {
  confidenceBand,
  latencyBand,
} from "@/utils/voice/diagnostics";
import { voiceEvents } from "@/services/voice/events";
import { voiceExecutor } from "@/services/voice/voice-executor";
import { voiceTermRepository } from "@/services/voice/voice-repository";
import { localCommandRouter } from "@/services/voice/local-command-router";
import { externalVoiceResolver } from "@/services/voice/external-resolver-service";
import { getVoiceInstallationId } from "@/services/voice/installation-id";
import {
  remotePlaybackAnnouncement,
  remotePlaybackQueue,
  toRemoteContentItems,
} from "@/utils/voice/external-playback";
import { ukSpeech } from "@/services/voice/speech";
import { triggerVoiceCloseFeedback } from "@/services/voice/voice-feedback";
import { ambiguityController } from "@/services/voice/ambiguity-controller";
import { feedbackVoiceController } from "@/services/voice/feedback-controller";
import { hasMeaningfulSpeech } from "@/utils/voice/normalize";
import {
  detectPlatformSpeechCapabilities,
  ensureVoicePermissions,
} from "@/services/voice/speech-recognition-bootstrap";
import {
  buildRecognitionOptions,
  resolveRecognitionPurpose,
} from "@/services/voice/recognition-profile";
import {
  prepareAsrHypotheses,
  sanitizedHypotheses,
} from "@/utils/voice/asr-hypotheses";
import { WholeWordProfanityFilter } from "@/utils/voice/profanity-filter";
import {
  modelStateNeedsRecheck,
  speechModelManager,
} from "@/services/voice/speech-model-manager";
import {
  usePlaybackStore,
  usePreferencesStore,
  useContentStore,
  useSpeechCapabilityStore,
  useExternalVoiceStore,
  useVoiceStore,
} from "@/stores";
import type {
  ActiveVoiceSession,
  EntityType,
  ExternalResolverResponse,
  PlatformSpeechCapabilities,
  RecognitionPurpose,
  ScreenVoiceCapability,
  ScreenVoiceContext,
  VoiceChoice,
  VoiceContextValue,
  VoiceFailureOptions,
  VoiceHypothesis,
  VoiceInvocation,
  VoiceInvocationSource,
} from "@/types";
import {
  voiceCopy as copy,
  withVoiceRetryGuidance,
} from "@/utils/copy/voice";
import { generateVoiceSessionId } from "@/utils/voice";
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
import { VoiceContext } from "./voice-context";

async function getRecognitionBiasTermsSafely(
  screen?: ScreenVoiceContext | null,
): Promise<string[]> {
  try {
    const playback = usePlaybackStore.getState();
    return (
      (await voiceTermRepository.getRecognitionBiasTerms?.({
        screenId: screen?.id ?? "unknown",
        activeEntityIds: playback.current
          ? [`story:${playback.current.id}`]
          : [],
        limit: 40,
      })) ?? []
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

async function withDelayedExternalProgress<T>(
  requestId: string,
  signal: AbortSignal,
  request: () => Promise<T>,
): Promise<T> {
  let progressSpeech: Promise<void> | undefined;
  const timer = setTimeout(() => {
    if (signal.aborted) return;
    useVoiceStore.getState().setVoice({
      state: "resolving",
      message: "Still searching Hear!…",
    });
    progressSpeech = voiceAnnounce(
      "I’m still searching Hear!",
      `voice:external-progress:${requestId}`,
    );
  }, EXTERNAL_VOICE_CONFIG.delayedProgressMs);
  try {
    const result = await request();
    if (progressSpeech) await progressSpeech;
    return result;
  } finally {
    clearTimeout(timer);
  }
}

export function VoiceProvider({ children }: PropsWithChildren) {
  const voice = useVoiceStore();
  const router = useRouter();

  const [activeScreen, setActiveScreen] = useState<ScreenVoiceContext | null>(
    null,
  );
  const activeScreenRef = useRef<ScreenVoiceContext | null>(null);

  useEffect(() => {
    activeScreenRef.current = activeScreen;
  }, [activeScreen]);

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
  const asrStopWaitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const capabilitiesRef = useRef<PlatformSpeechCapabilities | null>(null);
  const contextualStringsRef = useRef<string[]>([]);
  const recognitionPurposeRef = useRef<RecognitionPurpose>("command");
  const externalDispatchLatch = useRef(false);
  const externalRequestController = useRef<AbortController | undefined>(
    undefined,
  );

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
    if (asrStopWaitTimer.current) clearTimeout(asrStopWaitTimer.current);
    preSpeechTimer.current = undefined;
    noSpeechHapticTimer.current = undefined;
    postSpeechSilenceTimer.current = undefined;
    activityWatchdogTimer.current = undefined;
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
    (announce?: string, withFeedback = false) => {
      const session = active.current;
      session?.controller.abort();
      active.current = undefined;
      clearTimers();
      if (session) {
        try {
          ExpoSpeechRecognitionModule.abort();
        } catch { }
        microphoneClosed.current = false;
      } else {
        microphoneClosed.current = true;
      }
      void (async () => {
        await ukSpeech.stop();
        await waitForMicrophoneClose();
        speechCoordinator.exitQuietMode();
        if (announce) void voiceAnnounce(announce);
        if (withFeedback) triggerVoiceCloseFeedback("cancel");
      })();
      useVoiceStore.getState().resetVoice();
    },
    [clearTimers, waitForMicrophoneClose],
  );

  const services = useCallback(() => {
    const playback = usePlaybackStore.getState();
    const preferences = usePreferencesStore.getState();
    const content = useContentStore.getState();
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
          return "You are browsing Hear! Listener. Shake device to speak.";
        if (typeof current.readout === "function") return current.readout();
        return (
          current.readout ||
          `${current.title || "Current screen"}. Shake device to speak.`
        );
      },
      data: {
        stories: content.stories,
        topics: content.topics,
        entities: content.entities,
      },
      voiceData: {
        resetVoiceCorrections: () =>
          voiceTermRepository.resetLearnedAliases?.() ?? Promise.resolve(),
      },
    };
  }, [router]);

  const finish = useCallback(
    (
      message: string,
      errorCode?: string,
      options: VoiceFailureOptions = {},
    ) => {
      const session = active.current;
      const retryable = options.retryable ?? true;
      const spokenMessage =
        options.includeRetryGuidance === false
          ? message
          : withVoiceRetryGuidance(message);
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
        retryable,
        choices: [],
        prompt: "",
      });
      void waitForMicrophoneClose().then(() => {
        speechCoordinator.exitQuietMode();
        if (session?.playbackWasPlaying) usePlaybackStore.getState().resume();
        triggerVoiceCloseFeedback("error");
        if (session?.source !== "onboardingPractice") {
          void voiceAnnounce(
            spokenMessage,
            `voice:error:${errorCode ?? "general"}`,
          );
        }
      });
    },
    [clearTimers, waitForMicrophoneClose],
  );

  const finishWithoutResume = useCallback(
    (
      message: string,
      errorCode?: string,
      options: VoiceFailureOptions = {},
    ) => {
      const session = active.current;
      const retryable = options.retryable ?? true;
      const spokenMessage =
        options.includeRetryGuidance === false
          ? message
          : withVoiceRetryGuidance(message);
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
        retryable,
        choices: [],
        prompt: "",
      });
      active.current = undefined;
      void waitForMicrophoneClose().then(() => {
        speechCoordinator.exitQuietMode();
        triggerVoiceCloseFeedback("error");
        if (options.announce !== false && session?.source !== "onboardingPractice") {
          void voiceAnnounce(
            spokenMessage,
            `voice:error:${errorCode ?? "general"}`,
          );
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

      if (invocation.executorKey === "cancel") {
        active.current = undefined;
        useVoiceStore.getState().resetVoice();
        triggerVoiceCloseFeedback("cancel");
        speechCoordinator.exitQuietMode();
        await voiceAnnounce(
          copy.closedAnnounce,
          `voice:cancel:${invocation.idempotencyKey}`,
        );
        if (current?.playbackWasPlaying) {
          usePlaybackStore.getState().resume();
        }
        return;
      }

      if (alias) {
        const target =
          invocation.slots.storyId ??
          invocation.slots.entityId ??
          invocation.slots.topicId ??
          invocation.slots.locationId;
        const kind: EntityType | undefined = invocation.slots.storyId
          ? "story"
          : invocation.slots.entityId
            ? ((invocation.slots.entityType as EntityType) ?? "publication")
            : invocation.slots.topicId
              ? "category"
              : invocation.slots.locationId
                ? "location"
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

  const handleExternalResponse = useCallback(
    async (
      response: ExternalResolverResponse,
      context: {
        voiceSessionId: string;
        installationId: string;
        resumePlaybackOnCancel?: boolean;
      },
      signal: AbortSignal,
    ) => {
      if (signal.aborted) return;
      const externalVoice = useExternalVoiceStore.getState();
      const pending = externalVoice.receiveResponse(response, context);

      if (response.kind === "ambiguity" || response.kind === "confirmation") {
        if (!pending) return;
        active.current = undefined;
        clearTimers();
        useVoiceStore.getState().setVoice({
          state: "clarifying",
          prompt: pending.prompt,
          message: pending.prompt,
          choices: pending.choices,
        });
        void appHaptics.clarification();
        await voiceAnnounce(
          pending.prompt,
          `voice:external-${pending.phase}:${pending.interactionToken}`,
        );
        if (
          !signal.aborted &&
          useExternalVoiceStore.getState().getPending()?.interactionToken ===
            pending.interactionToken
        ) {
          voiceEvents.trigger("contextualAction", false);
        }
        return;
      }

      if (response.kind === "clarification") {
        active.current = undefined;
        clearTimers();
        useVoiceStore.getState().setVoice({
          state: "clarifying",
          prompt: response.prompt,
          message: response.prompt,
          choices: [],
        });
        await voiceAnnounce(response.prompt, "voice:external-clarification");
        if (
          !signal.aborted &&
          useVoiceStore.getState().state === "clarifying"
        ) {
          voiceEvents.trigger("contextualAction", false);
        }
        return;
      }

      if (response.kind === "unresolved") {
        finish(response.prompt, "external-unresolved");
        if (context.resumePlaybackOnCancel) {
          usePlaybackStore.getState().resume();
        }
        return;
      }

      if (response.kind === "error") {
        if (response.code === "request-cancelled") {
          externalVoice.cancelRequest();
          return;
        }
        finish(response.message, response.code);
        if (context.resumePlaybackOnCancel) {
          usePlaybackStore.getState().resume();
        }
        return;
      }

      const items = toRemoteContentItems(response.tracks);
      const first = response.tracks[0];
      if (!first || items.length === 0) {
        finish(
          "I found results, but none can be played right now.",
          "non-playable-results",
        );
        return;
      }

      clearTimers();
      useVoiceStore.getState().setVoice({
        state: "executing",
        message: "Getting your audio ready.",
        choices: [],
        prompt: "",
      });
      const announcement =
        response.announcement ?? remotePlaybackAnnouncement(first);
      await voiceAnnounce(
        announcement,
        `voice:external-playback:${first.contentId}`,
      );
      if (signal.aborted) return;
      active.current = undefined;
      useVoiceStore.getState().resetVoice();
      void appHaptics.success();
      const playbackQueue = remotePlaybackQueue(items);
      usePlaybackStore
        .getState()
        .playQueue(playbackQueue.items, { mode: playbackQueue.mode });
    },
    [clearTimers, finish],
  );

  const continueExternalInteraction = useCallback(
    async (
      action:
        | { kind: "select"; candidateId: string }
        | { kind: "confirm"; approved: boolean },
    ) => {
      const externalVoice = useExternalVoiceStore.getState();
      const pending = externalVoice.getPending();
      if (!pending || externalDispatchLatch.current) return;
      if (action.kind === "confirm" && !action.approved) {
        externalVoice.clearPending();
        active.current = undefined;
        useVoiceStore.getState().resetVoice();
        triggerVoiceCloseFeedback("cancel");
        await voiceAnnounce(copy.closedAnnounce, "voice:external-cancel");
        if (pending.resumePlaybackOnCancel) {
          usePlaybackStore.getState().resume();
        }
        return;
      }

      externalDispatchLatch.current = true;
      externalRequestController.current?.abort();
      const controller = new AbortController();
      externalRequestController.current = controller;
      const parentSignal = active.current?.controller.signal;
      const abortFromParent = () => controller.abort();
      parentSignal?.addEventListener("abort", abortFromParent, { once: true });
      const requestId = generateVoiceSessionId();
      externalVoice.beginRequest();
      useVoiceStore.getState().setVoice({
        state: "resolving",
        message:
          action.kind === "confirm"
            ? "Searching Hear!…"
            : "Resolving your choice…",
        choices: [],
        prompt: "",
      });

      let responseHandled = false;
      try {
        const response = await withDelayedExternalProgress(
          requestId,
          controller.signal,
          () =>
            externalVoiceResolver.continue({
              interactionToken: pending.interactionToken,
              voiceSessionId: pending.voiceSessionId,
              requestId,
              installationId: pending.installationId,
              action:
                action.kind === "select"
                  ? { kind: "select", candidateId: action.candidateId }
                  : { kind: "confirm", approved: true },
              signal: controller.signal,
            }),
        );
        if (!controller.signal.aborted) {
          responseHandled = true;
          await handleExternalResponse(
            response,
            {
              voiceSessionId: pending.voiceSessionId,
              installationId: pending.installationId,
              resumePlaybackOnCancel: pending.resumePlaybackOnCancel,
            },
            controller.signal,
          );
        }
      } finally {
        if (controller.signal.aborted && !responseHandled) {
          useExternalVoiceStore.getState().cancelRequest();
        }
        parentSignal?.removeEventListener("abort", abortFromParent);
        if (externalRequestController.current === controller) {
          externalRequestController.current = undefined;
        }
        externalDispatchLatch.current = false;
      }
    },
    [handleExternalResponse],
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

      const prepared = prepareAsrHypotheses(
        hypotheses,
        contextualStringsRef.current,
      );
      const cleanHypotheses = sanitizedHypotheses(prepared);
      const primaryTranscript = cleanHypotheses[0]?.transcript?.trim() ?? "";

      if (!hasMeaningfulSpeech(primaryTranscript)) {
        finish(
          "I didn't hear anything. Listening is closed. Shake device when you're ready to speak again.",
          "no-speech",
        );
        return;
      }

      if (session.source === "onboardingPractice") {
        await waitForMicrophoneClose();
        speechCoordinator.exitQuietMode();
        active.current = undefined;
        const transcript = primaryTranscript;
        useVoiceStore.getState().setVoice({
          state: "idle",
          transcript,
        });
        return;
      }

      useVoiceStore.getState().setVoice({
        state: "resolving",
        transcript: primaryTranscript,
        message: "Finding the best match.",
      });

      try {
        await waitForMicrophoneClose();
      } catch { }

      if (active.current?.id !== id) return;
      speechCoordinator.exitQuietMode();

      useVoiceStore.getState().setVoice({
        state: "resolving",
        transcript: cleanHypotheses[0]?.transcript ?? "",
        message: "Finding the best match.",
      });

      const externalVoice = useExternalVoiceStore.getState();
      const pendingExternal = externalVoice.getPending();
      const pendingExternalDecision =
        externalVoice.interpretPending(primaryTranscript);
      if (pendingExternalDecision) {
        if (pendingExternalDecision.kind === "cancel") {
          externalVoice.clearPending();
          active.current = undefined;
          useVoiceStore.getState().resetVoice();
          triggerVoiceCloseFeedback("cancel");
          await voiceAnnounce(copy.closedAnnounce, "voice:external-cancel");
          if (
            pendingExternal?.resumePlaybackOnCancel ||
            session.playbackWasPlaying
          ) {
            usePlaybackStore.getState().resume();
          }
          return;
        }
        if (
          pendingExternalDecision.kind === "repeat" ||
          pendingExternalDecision.kind === "invalid"
        ) {
          active.current = undefined;
          useVoiceStore.getState().setVoice({
            state: "clarifying",
            prompt: pendingExternalDecision.prompt,
            message: pendingExternalDecision.prompt,
            choices: pendingExternalDecision.choices,
          });
          await voiceAnnounce(
            pendingExternalDecision.prompt,
            `voice:external-repeat:${id}`,
          );
          if (useExternalVoiceStore.getState().getPending()) {
            voiceEvents.trigger("contextualAction", false);
          }
          return;
        }
        await continueExternalInteraction(
          pendingExternalDecision.kind === "select"
            ? {
                kind: "select",
                candidateId: pendingExternalDecision.candidateId,
              }
            : { kind: "confirm", approved: true },
        );
        return;
      }

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
        const snapshot = session.screenSnapshot ?? activeScreenRef.current;
        const capability: ScreenVoiceCapability = {
          screenId: snapshot?.id ?? "unknown",
          routeKey: snapshotPath ?? "/",
          instanceId: "inst",
          stateVersion: 1,
          phase: "ready",
          title: snapshot?.title ?? "screen",
          readout: () => "",
          localCommands: snapshot?.commands ?? [],
          remoteCapabilities: [],
          recognitionExpectation: snapshot?.recognitionExpectation,
          voiceEnabled: true,
        };
        const routeResult = await localCommandRouter.route(
          id,
          cleanHypotheses,
          capability,
          { preferences, playback, currentPath: snapshotPath ?? "/" },
          session.controller.signal,
        );
        clearTimeout(timeout);
        if (active.current?.id !== id || session.controller.signal.aborted)
          return;

        if (routeResult.kind === "execute") {
          await voiceDiagnostics.record({
            timestamp: Date.now(),
            outcome: "success",
            latencyBand: latencyBand(Date.now() - started),
            confidenceBand: confidenceBand(routeResult.invocation.confidence),
            actionId: routeResult.invocation.actionId,
            databaseVersion:
              typeof routeResult.invocation.databaseVersion === "number"
                ? routeResult.invocation.databaseVersion
                : 1,
            recognitionPurpose: recognitionPurposeRef.current,
            speechLocale: VOICE_LANGUAGE,
          });
          await execute(routeResult.invocation);
        } else if (routeResult.kind === "ambiguity") {
          active.current = undefined;
          useVoiceStore.getState().setVoice({
            state: "clarifying",
            prompt: routeResult.prompt,
            message: routeResult.prompt,
            choices: routeResult.choices,
          });
          void appHaptics.clarification();
          await voiceDiagnostics.record({
            timestamp: Date.now(),
            outcome: "clarification",
            latencyBand: latencyBand(Date.now() - started),
            confidenceBand: "medium",
          });
          void voiceAnnounce(routeResult.prompt);
        } else if (routeResult.kind === "feedback") {
          active.current = undefined;
          useVoiceStore.getState().setVoice({
            state: "clarifying",
            prompt: routeResult.prompt,
            message: routeResult.prompt,
            choices: [],
          });
          void voiceAnnounce(routeResult.prompt);
        } else if (routeResult.kind === "selected") {
          active.current = undefined;
          useVoiceStore.getState().setVoice({ state: "clarifying" });
        } else if (routeResult.kind === "cancelled") {
          active.current = undefined;
          useVoiceStore.getState().resetVoice();
        } else if (routeResult.kind === "remote") {
          const installationId = await getVoiceInstallationId();
          if (
            active.current?.id !== id ||
            session.controller.signal.aborted
          ) {
            return;
          }
          const requestId = generateVoiceSessionId();
          useExternalVoiceStore.getState().beginRequest();
          useVoiceStore.getState().setVoice({
            originalTranscript: routeResult.originalTranscript,
            preparedTranscript: routeResult.preparedTranscript,
            transcript: routeResult.originalTranscript,
            message: "Resolving your Hear! search…",
          });
          const externalResult = await withDelayedExternalProgress(
            requestId,
            session.controller.signal,
            () =>
              externalVoiceResolver.resolve({
                originalTranscript: routeResult.originalTranscript,
                preparedTranscript: routeResult.preparedTranscript,
                locale: "en-GB",
                timezone: "Europe/London",
                country: "gb",
                voiceSessionId: id,
                requestId,
                installationId,
                signal: session.controller.signal,
              }),
          );
          if (!session.controller.signal.aborted) {
            await handleExternalResponse(
              externalResult,
              {
                voiceSessionId: id,
                installationId,
                resumePlaybackOnCancel: session.playbackWasPlaying,
              },
              session.controller.signal,
            );
          } else {
            useExternalVoiceStore.getState().cancelRequest();
          }
        } else {
          finish(
            "I could not match that command. Shake device to try again.",
            routeResult.reason ?? "unrecognised",
          );
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
    [
      clearTimers,
      continueExternalInteraction,
      execute,
      finish,
      handleExternalResponse,
      waitForMicrophoneClose,
    ],
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
      const session = active.current;
      const purpose = resolveRecognitionPurpose({
        expectation: session?.screenSnapshot?.recognitionExpectation,
        clarifying: useVoiceStore.getState().state === "clarifying",
        pendingAmbiguity: Boolean(
          ambiguityController.getPending() ||
            useExternalVoiceStore.getState().getPending(),
        ),
        pendingFeedback: Boolean(feedbackVoiceController.getTarget()),
      });
      recognitionPurposeRef.current = purpose;
      const contextualStrings = await getRecognitionBiasTermsSafely(
        session?.screenSnapshot ?? activeScreenRef.current,
      );
      if (active.current?.id !== id) return;

      finalSegments.current = [];
      currentPartial.current = "";
      lastSpeechActivityAt.current = 0;
      contextualStringsRef.current = contextualStrings;

      speechCoordinator.enterQuietMode();

      const capabilities =
        capabilitiesRef.current ?? detectPlatformSpeechCapabilities();
      const options = buildRecognitionOptions(
        purpose,
        contextualStrings,
        capabilities,
      );

      const activeSession = active.current;
      if (!activeSession || activeSession.id !== id) return;

      const startedAt = Date.now();
      const deadlineAt = startedAt + VOICE_TIMING.preSpeechTimeout;
      activeSession.startedAt = startedAt;
      activeSession.deadlineAt = deadlineAt;
      activeSession.speechDetected = false;
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

      try {
        await ExpoSpeechRecognitionModule.start(options);
      } catch { }

      resetActivityWatchdog(id);

    },
    [finish, resetActivityWatchdog],
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

      const capabilities = detectPlatformSpeechCapabilities();
      capabilitiesRef.current = capabilities;
      useSpeechCapabilityStore.getState().setCapabilities(capabilities);
      if (active.current?.id !== id) return;
      if (!capabilities.recognitionAvailable) {
        finish(
          "Voice isn't supported on this device. You can still browse and listen by touch.",
          "service-not-allowed",
          { includeRetryGuidance: false, retryable: false },
        );
        return;
      }

      useVoiceStore.getState().setVoice({
        state: "preparing",
        sessionId: id,
        transcript: "",
        message: "Getting ready…",
        choices: [],
      });

      try {
        const microphoneState =
          await ExpoSpeechRecognitionModule.getMicrophonePermissionsAsync();
        const willPrompt =
          microphoneState &&
          !microphoneState.granted &&
          microphoneState.canAskAgain !== false;
        if (willPrompt) {
          speechCoordinator.exitQuietMode();
          await voiceAnnounce(copy.permissionExplain);
        }
        if (active.current?.id !== id) return;

        const permission = await ensureVoicePermissions(capabilities, false);
        useSpeechCapabilityStore
          .getState()
          .setPermissionState(permission.permissionState);
        if (active.current?.id !== id) return;
        if (!permission.ok) {
          const message =
            permission.failureReason === "microphone-denied"
              ? "Microphone access is off. Open Settings to enable microphone."
              : permission.failureReason === "speech-restricted"
                ? "Speech recognition is restricted on this device. You can still browse and listen by touch."
                : "Speech recognition is off. Open Settings to enable it.";
          finishWithoutResume(
            message,
            permission.failureReason ?? "permission-denied",
            permission.failureReason === "speech-restricted"
              ? { includeRetryGuidance: false, retryable: false }
              : undefined,
          );
          return;
        }

        if (capabilities.platform === "android") {
          useSpeechCapabilityStore.getState().setModelState("checking");
          const modelState = await speechModelManager.checkEnGbModel(capabilities);
          useSpeechCapabilityStore.getState().setModelState(modelState);
          if (modelState === "missing") {
            const message =
              "English UK speech recognition needs to be downloaded. I will open the download now. When it finishes, shake device to try your voice command again.";
            speechCoordinator.exitQuietMode();
            await voiceAnnounce(
              message,
              `voice:language-model-download:${id}`,
            );
            if (active.current?.id !== id) return;
            const downloadState =
              await speechModelManager.requestEnGbModelDownload(capabilities);
            useSpeechCapabilityStore.getState().setModelState(downloadState);
            finishWithoutResume(
              message,
              "language-model-downloading",
              { announce: false },
            );
            return;
          }
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
    useExternalVoiceStore.getState().resetExternalVoice();
    externalRequestController.current?.abort();
    externalRequestController.current = undefined;
    externalDispatchLatch.current = false;
    endSession(undefined, true);
  }, [endSession]);

  const stop = useCallback(() => {
    const session = active.current;
    if (!session) return;
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch { }
    const transcript = useVoiceStore.getState().transcript.trim();
    if (hasMeaningfulSpeech(transcript)) {
      void resolve(session.id, [{ transcript, confidence: 0.8, rank: 0 }]);
      return;
    }
    finish("I did not hear a command. Shake device to try again.", "no-speech");
  }, [finish, resolve]);

  const close = useCallback(() => {
    useExternalVoiceStore.getState().resetExternalVoice();
    externalRequestController.current?.abort();
    externalRequestController.current = undefined;
    externalDispatchLatch.current = false;
    endSession(undefined, true);
  }, [endSession]);

  const dismiss = useCallback(() => {
    useExternalVoiceStore.getState().resetExternalVoice();
    externalRequestController.current?.abort();
    externalRequestController.current = undefined;
    externalDispatchLatch.current = false;
    endSession(copy.closedAnnounce, true);
  }, [endSession]);

  const choose = useCallback(
    async (choice: VoiceChoice) => {
      if (choice.externalAction) {
        await continueExternalInteraction(choice.externalAction);
        return;
      }
      if (choice.invocation) {
        await execute(choice.invocation, choice.alias, choice.label);
      }
    },
    [continueExternalInteraction, execute],
  );

  useSpeechRecognitionEvent("start", () => {
    if (active.current) {
      active.current.asrConfirmed = true;
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
      if (hasMeaningfulSpeech(full)) {
        if (postSpeechSilenceTimer.current)
          clearTimeout(postSpeechSilenceTimer.current);
        void resolve(session.id, [{ transcript: full, confidence: 0.85, rank: 0 }]);
      }
    }
  });

  useSpeechRecognitionEvent("speechstart", () => {
    const session = active.current;
    if (!session || session.controller.signal.aborted) return;
    lastSpeechActivityAt.current = Date.now();

    const full = [...finalSegments.current, currentPartial.current]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");

    if (hasMeaningfulSpeech(full)) {
      session.speechDetected = true;
      resetActivityWatchdog(session.id);
      if (preSpeechTimer.current) clearTimeout(preSpeechTimer.current);
      if (noSpeechHapticTimer.current) clearTimeout(noSpeechHapticTimer.current);
      preSpeechTimer.current = undefined;
      noSpeechHapticTimer.current = undefined;

      useVoiceStore.getState().setVoice({
        state: "listening",
        speechDetected: true,
        message: "Listening…",
      });

      if (postSpeechSilenceTimer.current)
        clearTimeout(postSpeechSilenceTimer.current);
      postSpeechSilenceTimer.current = setTimeout(() => {
        const fullNow = [...finalSegments.current, currentPartial.current]
          .map((s) => s.trim())
          .filter(Boolean)
          .join(" ");
        if (hasMeaningfulSpeech(fullNow) && active.current?.id === session.id) {
          void resolve(session.id, [{ transcript: fullNow, confidence: 0.9, rank: 0 }]);
        }
      }, VOICE_TIMING.postSpeechSilence);
    }
  });

  useSpeechRecognitionEvent("speechend", () => {
    const session = active.current;
    if (!session || session.finalHandled || session.controller.signal.aborted) return;
    lastSpeechActivityAt.current = Date.now();

    const full = [...finalSegments.current, currentPartial.current]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");

    if (hasMeaningfulSpeech(full)) {
      session.speechDetected = true;
      if (preSpeechTimer.current) clearTimeout(preSpeechTimer.current);
      if (noSpeechHapticTimer.current) clearTimeout(noSpeechHapticTimer.current);
      preSpeechTimer.current = undefined;
      noSpeechHapticTimer.current = undefined;

      useVoiceStore.getState().setVoice({
        state: "listening",
        speechDetected: true,
        message: "Listening…",
      });

      if (postSpeechSilenceTimer.current)
        clearTimeout(postSpeechSilenceTimer.current);
      postSpeechSilenceTimer.current = setTimeout(() => {
        const fullNow = [...finalSegments.current, currentPartial.current]
          .map((s) => s.trim())
          .filter(Boolean)
          .join(" ");
        if (hasMeaningfulSpeech(fullNow) && active.current?.id === session.id) {
          void resolve(session.id, [{ transcript: fullNow, confidence: 0.9, rank: 0 }]);
        }
      }, VOICE_TIMING.postSpeechSilence);
    }
  });

  useSpeechRecognitionEvent("result", (event) => {
    const session = active.current;
    if (!session || session.controller.signal.aborted) return;

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

      if (hasMeaningfulSpeech(fullTranscript)) {
        if (!session.speechDetected) {
          session.speechDetected = true;
          if (preSpeechTimer.current) clearTimeout(preSpeechTimer.current);
          if (noSpeechHapticTimer.current) clearTimeout(noSpeechHapticTimer.current);
          preSpeechTimer.current = undefined;
          noSpeechHapticTimer.current = undefined;
        }
        resetActivityWatchdog(session.id);

        const displayTranscript = new WholeWordProfanityFilter(
          contextualStringsRef.current,
        )
          .sanitize(fullTranscript, "remove")
          .sanitized;

        useVoiceStore.getState().setVoice({
          transcript: displayTranscript,
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

        if (postSpeechSilenceTimer.current)
          clearTimeout(postSpeechSilenceTimer.current);
        postSpeechSilenceTimer.current = setTimeout(() => {
          const fullNow = [...finalSegments.current, currentPartial.current]
            .map((s) => s.trim())
            .filter(Boolean)
            .join(" ");
          if (hasMeaningfulSpeech(fullNow) && active.current?.id === session.id) {
            const resolvedHypotheses = hypotheses.map((h, i) =>
              i === 0 ? { ...h, transcript: fullNow } : h,
            );
            if (resolvedHypotheses.length === 0) {
              resolvedHypotheses.push({
                transcript: fullNow,
                confidence: 0.85,
                rank: 0,
              });
            }
            void resolve(session.id, resolvedHypotheses);
          }
        }, VOICE_TIMING.postSpeechSilence);
      }
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (event.error === "aborted" || !active.current) return;
    if (event.error === "no-speech" || event.error === "speech-timeout") {
      return;
    }
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
    } else if (errorCode === "language-not-supported") {
      finishWithoutResume(
        "English UK speech recognition is not installed on this device. Download the language model, then try again.",
        "language-model-missing",
      );
      return;
    } else if (errorCode === "network") {
      message =
        "Network error during speech recognition. Please check your connection.";
    }
    finish(message, errorCode);
  });

  useEffect(() => {
    void voiceTermRepository
      .initialize()
      .then(() => voiceTermRepository.healthCheck())
      .then((health) => {
        if (health && !health.ready) {
          useVoiceStore.getState().setVoice({
            state: "error",
            message: "The voice database needs to be restored.",
            retryable: false,
          });
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        useExternalVoiceStore.getState().resetExternalVoice();
        externalRequestController.current?.abort();
        externalRequestController.current = undefined;
      }
      if (state !== "active" && active.current) endSession();
      if (state !== "active") return;
      const capabilityState = useSpeechCapabilityStore.getState();
      const capabilities = capabilityState.capabilities;
      if (
        capabilities?.platform === "android" &&
        modelStateNeedsRecheck(capabilityState.modelState)
      ) {
        void speechModelManager
          .checkEnGbModel(capabilities)
          .then((modelState) => {
            useSpeechCapabilityStore.getState().setModelState(modelState);
          })
          .catch(() => {
            useSpeechCapabilityStore.getState().setModelState("error");
          });
      }
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
      dismiss,
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
      dismiss,
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
