import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { VOICE_TIMING } from "@/constants/voice";
import { playListeningStartTone } from "@/lib/audio/one-shots";
import { appHaptics } from "@/lib/haptics";
import { externalVoiceResolver } from "./external-resolver";
import { voiceExecutor } from "./executor";
import { ukSpeech } from "./speech";
import { speechCoordinator, voiceAnnounce } from "./speech-coordinator";
import { usePlaybackStore } from "@/stores/playback-store";
import { usePreferencesStore } from "@/stores/preferences-store";
import { useVoiceStore } from "@/stores/voice-store";
import type {
  ActiveVoiceSession,
  ScreenVoiceCapability,
  VoiceHypothesis,
  VoiceInvocation,
  VoiceInvocationSource,
  VoiceScreenId,
} from "@/types";
import {
  generateVoiceSessionId,
  isSpeechRecognitionSupported,
  requestMicrophonePermissionSafely,
} from "@/utils/voice";
import { localCommandRouter } from "./local-command-router";
import { requestLedger } from "./request-ledger";

export class VoiceSessionEngine {
  private activeSession?: ActiveVoiceSession;
  private preSpeechTimer?: ReturnType<typeof setTimeout>;
  private activityWatchdogTimer?: ReturnType<typeof setTimeout>;
  private noSpeechHapticTimer?: ReturnType<typeof setTimeout>;
  private finalSegments: string[] = [];
  private currentPartial = "";
  private lastSpeechActivityAt = 0;
  private microphoneClosed = true;
  private microphoneCloseResolvers = new Set<() => void>();

  public getActiveSession(): ActiveVoiceSession | undefined {
    return this.activeSession;
  }

  public isSessionActive(id: string): boolean {
    return this.activeSession?.id === id;
  }

  public async invoke(
    source: VoiceInvocationSource = "shakeGesture",
    screenSnapshot?: ScreenVoiceCapability | null,
    announceLocation = true,
  ): Promise<void> {
    if (this.activeSession) {
      this.cancel("session-replaced");
    }

    await ukSpeech.stop();
    const playback = usePlaybackStore.getState();
    const playbackWasPlaying = playback.playing;
    if (playbackWasPlaying) {
      playback.pause();
    }

    const sessionId = generateVoiceSessionId();
    const controller = new AbortController();
    const startedAt = Date.now();

    this.activeSession = {
      id: sessionId,
      controller,
      finalHandled: false,
      asrConfirmed: false,
      startedAt,
      deadlineAt: startedAt + VOICE_TIMING.preSpeechTimeout,
      speechDetected: false,
      playbackWasPlaying,
      source,
      screenSnapshot: screenSnapshot
        ? {
            id: (screenSnapshot.screenId as VoiceScreenId) ?? "unknown",
            pathname: screenSnapshot.routeKey,
            title: screenSnapshot.title,
            commands: screenSnapshot.localCommands,
            orientation: screenSnapshot.title,
            readout: screenSnapshot.readout,
            screenState: {
              phase: screenSnapshot.phase,
              stateVersion: screenSnapshot.stateVersion,
              instanceId: screenSnapshot.instanceId,
            },
          }
        : null,
    };

    const supported = await isSpeechRecognitionSupported();
    if (this.activeSession?.id !== sessionId) return;

    if (!supported) {
      this.finish(
        "Voice isn't supported on this device. You can still browse and listen by touch.",
        "service-not-allowed",
      );
      return;
    }

    useVoiceStore.getState().setVoice({
      state: "preparing",
      sessionId,
      transcript: "",
      message: "Getting ready…",
      prompt: "",
      choices: [],
      isVoiceActive: true,
      isDockVisible: true,
    });

    try {
      const { granted, undetermined } =
        await requestMicrophonePermissionSafely();

      if (undetermined) {
        speechCoordinator.exitQuietMode();
        await voiceAnnounce(
          "Hear needs microphone access to listen to your voice commands.",
        );
      }

      if (this.activeSession?.id !== sessionId) return;

      if (!granted) {
        this.finish(
          "Microphone access is off. Open Settings to enable microphone.",
          "permission-denied",
        );
        return;
      }

      if (announceLocation && screenSnapshot?.title) {
        speechCoordinator.exitQuietMode();
        await voiceAnnounce(
          `Voice ready on ${screenSnapshot.title}. Speak now.`,
        );
      }

      if (this.activeSession?.id !== sessionId) return;

      await playListeningStartTone();
      if (this.activeSession?.id !== sessionId) return;

      this.startNativeRecognition(sessionId);
    } catch {
      this.finish(
        "On-device speech recognition is unavailable on this device.",
        "recognition-unavailable",
      );
    }
  }

  private startNativeRecognition(sessionId: string): void {
    this.finalSegments = [];
    this.currentPartial = "";
    this.lastSpeechActivityAt = 0;

    try {
      ExpoSpeechRecognitionModule.start({
        lang: "en-GB",
        interimResults: true,
        continuous: false,
      });
    } catch {
      this.finish(
        "Failed to start microphone recognition.",
        "recognition-failed",
      );
    }
  }

  public handleNativeStart(): void {
    const session = this.activeSession;
    if (!session) return;

    session.asrConfirmed = true;
    const startedAt = Date.now();
    const deadlineAt = startedAt + VOICE_TIMING.preSpeechTimeout;
    session.startedAt = startedAt;
    session.deadlineAt = deadlineAt;
    session.speechDetected = false;

    useVoiceStore.getState().setVoice({
      state: "listening",
      message: "Speak now.",
      transcript: "",
      speechDetected: false,
      listeningStartedAt: startedAt,
      listeningDeadlineAt: deadlineAt,
    });

    void appHaptics.listening();

    this.noSpeechHapticTimer = setTimeout(() => {
      if (this.activeSession?.speechDetected || this.activeSession?.controller.signal.aborted) return;
      void appHaptics.listening();
      useVoiceStore.getState().setVoice({
        message: "Still listening. 4 seconds remaining.",
      });
    }, VOICE_TIMING.noSpeechHapticReminder);

    this.preSpeechTimer = setTimeout(() => {
      if (this.activeSession?.speechDetected || this.activeSession?.controller.signal.aborted) return;
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {}
      this.finish(
        "I didn't hear anything. Shake device when you're ready to speak again.",
        "no-speech-timeout",
      );
    }, VOICE_TIMING.preSpeechTimeout);
  }

  public handleSpeechStart(): void {
    const session = this.activeSession;
    if (!session) return;

    session.speechDetected = true;
    if (this.preSpeechTimer) clearTimeout(this.preSpeechTimer);
    if (this.noSpeechHapticTimer) clearTimeout(this.noSpeechHapticTimer);
    this.preSpeechTimer = undefined;
    this.noSpeechHapticTimer = undefined;
    this.lastSpeechActivityAt = Date.now();

    useVoiceStore.getState().setVoice({
      state: "listening",
      speechDetected: true,
      message: "Listening…",
    });

    this.resetActivityWatchdog(session.id);
  }

  public handlePartialResult(transcript: string): void {
    const session = this.activeSession;
    if (!session || session.finalHandled) return;

    this.currentPartial = transcript;
    session.speechDetected = true;
    this.lastSpeechActivityAt = Date.now();

    useVoiceStore.getState().setVoice({
      state: "listening",
      speechDetected: true,
      transcript,
    });

    this.resetActivityWatchdog(session.id);
  }

  public handleFinalResult(transcript: string): void {
    const session = this.activeSession;
    if (!session || session.finalHandled) return;

    this.finalSegments.push(transcript);
    this.currentPartial = "";
    const full = this.finalSegments.join(" ").trim();

    void this.resolve(session.id, [{ transcript: full, confidence: 0.9, rank: 0 }]);
  }

  public handleNativeEnd(): void {
    this.microphoneClosed = true;
    const resolvers = Array.from(this.microphoneCloseResolvers);
    this.microphoneCloseResolvers.clear();
    for (const fn of resolvers) {
      try {
        fn();
      } catch {}
    }

    const session = this.activeSession;
    if (session && !session.finalHandled && !session.controller.signal.aborted) {
      const full = [...this.finalSegments, this.currentPartial]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" ");

      if (full) {
        void this.resolve(session.id, [{ transcript: full, confidence: 0.85, rank: 0 }]);
      } else {
        this.finish(
          "I didn't hear anything. Shake device when you're ready to speak again.",
          "no-speech",
        );
      }
    }
  }

  public handleNativeError(errorMsg?: string): void {
    this.finish(
      "I did not hear a command. Shake device to try again.",
      errorMsg ?? "recognition-error",
    );
  }

  private async resolve(sessionId: string, hypotheses: VoiceHypothesis[]): Promise<void> {
    const session = this.activeSession;
    if (!session || session.id !== sessionId || session.finalHandled) return;
    session.finalHandled = true;

    this.clearTimers();
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {}

    const transcript = hypotheses[0]?.transcript?.trim() ?? "";
    useVoiceStore.getState().setVoice({
      state: "resolving",
      transcript,
      message: "Finding the best match…",
    });

    const routeResult = await localCommandRouter.route(
      sessionId,
      hypotheses,
      undefined,
      {
        preferences: usePreferencesStore.getState(),
        playback: usePlaybackStore.getState(),
      },
      session.controller.signal,
    );

    if (this.activeSession?.id !== sessionId || session.controller.signal.aborted) {
      return;
    }

    if (routeResult.kind === "execute") {
      await this.executeInvocation(routeResult.invocation);
    } else if (routeResult.kind === "ambiguity") {
      useVoiceStore.getState().setVoice({
        state: "clarifying",
        prompt: routeResult.prompt,
        message: routeResult.prompt,
        choices: routeResult.choices,
      });
      void appHaptics.clarification();
      void voiceAnnounce(routeResult.prompt);
    } else if (routeResult.kind === "remote") {
      const preferences = usePreferencesStore.getState();
      const playback = usePlaybackStore.getState();

      const externalResult = await externalVoiceResolver.resolve({
        transcript,
        screenContext: {
          pathname: session.screenSnapshot?.pathname ?? "/",
          playback: {
            current: playback.current,
            playing: playback.playing,
            progress: playback.progress,
            speed: playback.speed,
          },
          preferences,
        },
        signal: session.controller.signal,
      });

      if (this.activeSession?.id !== sessionId) return;

      if (externalResult.handled && externalResult.spokenResponse) {
        this.finishSuccess(externalResult.spokenResponse);
      } else {
        this.finish(
          "I could not match that command. Shake device to try again.",
          "unrecognised",
        );
      }
    } else {
      this.finish(
        "I could not match that command. Shake device to try again.",
        "unrecognised",
      );
    }
  }

  private async executeInvocation(invocation: VoiceInvocation): Promise<void> {
    useVoiceStore.getState().setVoice({
      state: "executing",
      message: "Working on that.",
    });

    const preferences = usePreferencesStore.getState();
    const playback = usePlaybackStore.getState();

    const services = {
      navigate: {
        replace: () => {},
        push: () => {},
        back: () => {},
        setDiscoverTopic: () => {},
      },
      playback,
      preferences: {
        savedIds: preferences.savedIds,
        downloadedIds: preferences.downloadedIds,
        followingIds: preferences.followingIds,
        update: preferences.updatePreferences,
      },
      readScreen: () => "Screen readout",
      data: { stories: [], topics: [], entities: [] },
      voiceData: {
        resetVoiceCorrections: () => Promise.resolve(),
      },
    };

    const result = await voiceExecutor.execute(invocation, services);

    requestLedger.record({
      requestId: invocation.idempotencyKey,
      sessionId: invocation.recognitionSessionId,
      idempotencyKey: invocation.idempotencyKey,
      origin: {
        screenId: "screen",
        instanceId: "inst",
        stateVersion: 1,
        routeKey: "/",
      },
      actionId: invocation.actionId,
      status: result.ok ? "completed" : "failed",
      startedAt: Date.now(),
      completedAt: Date.now(),
    });

    if (result.ok) {
      const isNav =
        invocation.executorKey === "navigate" ||
        invocation.executorKey.startsWith("open") ||
        invocation.executorKey.startsWith("onboarding");
      this.finishSuccess(result.feedback ?? "Done", isNav);
    } else {
      this.finish("That action could not be completed.", result.errorCode);
    }
  }

  private finishSuccess(message: string, isNav = false): void {
    const session = this.activeSession;
    this.activeSession = undefined;
    this.clearTimers();

    useVoiceStore.getState().setVoice({
      state: "success",
      message,
      retryable: false,
      choices: [],
      prompt: "",
    });

    void appHaptics.success();
    speechCoordinator.exitQuietMode();
    void voiceAnnounce(message);

    if (session?.playbackWasPlaying) {
      usePlaybackStore.getState().resume();
    }

    if (isNav) {
      useVoiceStore.getState().resetVoice();
    } else {
      setTimeout(() => {
        useVoiceStore.getState().resetVoice();
      }, 1400);
    }
  }

  public finish(message: string, errorCode?: string): void {
    const session = this.activeSession;
    session?.controller.abort();
    this.activeSession = undefined;
    this.clearTimers();

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

    speechCoordinator.exitQuietMode();
    void appHaptics.error();
    void voiceAnnounce(message);

    if (session?.playbackWasPlaying) {
      usePlaybackStore.getState().resume();
    }
  }

  public cancel(reason = "user-cancelled"): void {
    const session = this.activeSession;
    session?.controller.abort();
    this.activeSession = undefined;
    this.clearTimers();

    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {}

    void ukSpeech.stop();
    speechCoordinator.exitQuietMode();
    useVoiceStore.getState().resetVoice();
  }

  private resetActivityWatchdog(sessionId: string): void {
    if (this.activityWatchdogTimer) clearTimeout(this.activityWatchdogTimer);
    this.activityWatchdogTimer = setTimeout(() => {
      if (this.activeSession?.id !== sessionId) return;
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {}
      this.finish(
        "The listening session ended. Start a new voice command when you are ready.",
        "recognition-timeout",
      );
    }, VOICE_TIMING.recognitionActivityWatchdog);
  }

  private clearTimers(): void {
    if (this.preSpeechTimer) clearTimeout(this.preSpeechTimer);
    if (this.noSpeechHapticTimer) clearTimeout(this.noSpeechHapticTimer);
    if (this.activityWatchdogTimer) clearTimeout(this.activityWatchdogTimer);
    this.preSpeechTimer = undefined;
    this.noSpeechHapticTimer = undefined;
    this.activityWatchdogTimer = undefined;
  }
}

export const voiceSessionEngine = new VoiceSessionEngine();
