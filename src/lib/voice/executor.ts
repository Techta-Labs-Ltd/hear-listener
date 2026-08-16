import type {
  VoiceExecutionResult,
  VoiceExecutor,
  VoiceExecutorKey,
  VoiceInvocation,
  VoiceServices,
} from "@/types";
import { runCommand } from "./run";
const EXECUTOR_KEYS = new Set<VoiceExecutorKey>([
  "navigate",
  "close",
  "openLibrarySection",
  "openTopic",
  "setLocation",
  "search",
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
  "saveCurrent",
  "removeSaved",
  "downloadCurrent",
  "removeDownload",
  "follow",
  "unfollow",
  "whatIsThis",
  "whoMadeThis",
  "sleepTimer",
  "cancelSleepTimer",
  "addToQueue",
  "openQueue",
  "clearQueue",
  "changeLocation",
  "help",
  "openAppSettings",
  "openAudioSettings",
  "openBluetoothSettings",
  "openInternetSettings",
  "openWifiSettings",
  "openAccessibilitySettings",
  "openLocationSettings",
  "resetVoiceCorrections",
  "readScreen",
  "accountSignIn",
  "accountSignOut",
  "onboardingContinue",
  "onboardingBack",
  "onboardingSkip",
  "onboardingSetTown",
  "onboardingRead",
  "onboardingUseSpokenSetup",
  "onboardingUseScreenControls",
  "onboardingPlaySoundCheck",
  "onboardingCannotHear",
  "onboardingUseLocation",
]);
class AppVoiceExecutor implements VoiceExecutor {
  private completed = new Map<string, number>();
  private chain = Promise.resolve<VoiceExecutionResult>({ ok: true });
  execute(invocation: VoiceInvocation, services: VoiceServices) {
    this.prune();
    if (!this.valid(invocation))
      return Promise.resolve({
        ok: false,
        errorCode: "invalid-invocation" as const,
      });
    if (this.completed.has(invocation.idempotencyKey))
      return Promise.resolve({ ok: false, errorCode: "duplicate" as const });
    this.completed.set(invocation.idempotencyKey, Date.now());
    const task = this.chain.then(() => {
      try {
        return {
          ok: true,
          feedback: runCommand(invocation.command, services) ?? undefined,
        };
      } catch {
        return { ok: false, errorCode: "execution-failed" as const };
      }
    });
    this.chain = task;
    return task;
  }
  private valid(invocation: VoiceInvocation) {
    return (
      EXECUTOR_KEYS.has(invocation.executorKey) &&
      invocation.command.type === invocation.executorKey &&
      invocation.confidence >= 0 &&
      invocation.confidence <= 1 &&
      !!invocation.recognitionSessionId
    );
  }
  private prune() {
    const cutoff = Date.now() - 300000;
    for (const [key, time] of this.completed)
      if (time < cutoff) this.completed.delete(key);
  }
}
export const voiceExecutor: VoiceExecutor = new AppVoiceExecutor();
