import type { SpeechPriority, SpeechRequest, VoiceAudioGate } from "@/types";
import { ukSpeech } from "./speech";

class AudioGateService implements VoiceAudioGate {
  private readonly quietScopes = new Set<string>();

  async enterQuietMode(scope = "voice"): Promise<void> {
    this.quietScopes.add(scope);
  }

  exitQuietMode(scope = "voice"): void {
    this.quietScopes.delete(scope);
  }

  isQuiet(): boolean {
    return this.quietScopes.size > 0;
  }
}

export const voiceAudioGate = new AudioGateService();

const priorityRank: Record<SpeechPriority, number> = {
  screen: 1,
  instruction: 2,
  session: 3,
};

class SpeechCoordinator {
  private active?: { key: string; priority: SpeechPriority };
  private readonly quietScopes = new Set<string>();
  private readonly audibleWaiters = new Set<() => void>();
  private readonly deferredSpeech = new Map<string, Promise<void>>();
  private deferredSpeechGeneration = 0;
  private screenReaderEnabled = false;
  lastCompletion: "DONE" | "INTERRUPTED" | "ERROR" | "TIMEOUT" = "DONE";

  setScreenReaderEnabled(enabled: boolean): void {
    this.screenReaderEnabled = enabled;
    if (enabled) {
      this.deferredSpeechGeneration += 1;
      void ukSpeech.stop();
      this.active = undefined;
    }
  }

  isScreenReaderEnabled(): boolean {
    return this.screenReaderEnabled;
  }

  enterQuietMode(scope = "voice"): void {
    this.quietScopes.add(scope);
    void voiceAudioGate.enterQuietMode(scope);
    void ukSpeech.stop();
    this.active = undefined;
  }

  exitQuietMode(scope = "voice"): void {
    this.quietScopes.delete(scope);
    voiceAudioGate.exitQuietMode(scope);
    this.releaseAudibleWaiters();
  }

  setContentPlaybackActive(active: boolean): void {
    if (active) {
      this.enterQuietMode("content-playback");
    } else {
      this.exitQuietMode("content-playback");
    }
  }

  isQuiet(): boolean {
    return this.quietScopes.size > 0 || voiceAudioGate.isQuiet();
  }

  async speak(request: SpeechRequest): Promise<void> {
    if (!request.text.trim()) return;
    if (this.isQuiet()) return;
    const priority = request.priority ?? "screen";

    // If native screen reader is enabled, suppress routine UI narration
    if (this.screenReaderEnabled && priority !== "instruction") {
      return;
    }

    if (
      this.active &&
      priorityRank[this.active.priority] > priorityRank[priority]
    ) {
      return;
    }

    const key = request.key;
    this.active = { key, priority };
    try {
      this.lastCompletion = await ukSpeech.speak(request.text, {
        interrupt: priority === "instruction" || request.force === true,
      });
    } finally {
      if (this.active?.key === key) this.active = undefined;
    }
  }

  announce(request: SpeechRequest): Promise<void> {
    return this.speak(request);
  }

  announceWhenAudible(
    request: SpeechRequest,
    timeoutMs = 3000,
  ): Promise<void> {
    const existing = this.deferredSpeech.get(request.key);
    if (existing) return existing;

    const generation = this.deferredSpeechGeneration;
    const pending = (async () => {
      const audible = await this.waitUntilAudible(timeoutMs);
      if (!audible || generation !== this.deferredSpeechGeneration) return;
      await this.speak(request);
    })();

    this.deferredSpeech.set(request.key, pending);
    const cleanup = () => {
      if (this.deferredSpeech.get(request.key) === pending) {
        this.deferredSpeech.delete(request.key);
      }
    };
    pending.then(cleanup, cleanup);
    return pending;
  }

  async speakBeforeListening(request: {
    text: string;
    key?: string;
    force?: boolean;
  }): Promise<void> {
    if (!request.text.trim()) return;
    this.exitQuietMode();
    const key = request.key ?? `beforeListening:${request.text}`;
    this.active = { key, priority: "instruction" };
    try {
      await ukSpeech.stop();
      this.lastCompletion = await ukSpeech.speak(request.text, { interrupt: true });
    } finally {
      if (this.active?.key === key) this.active = undefined;
    }
  }

  async cancel(_scope?: string): Promise<void> {
    this.deferredSpeechGeneration += 1;
    this.active = undefined;
    await ukSpeech.stop();
  }

  reset(_key?: string): void {
    this.active = undefined;
  }

  private waitUntilAudible(timeoutMs: number): Promise<boolean> {
    if (!this.isQuiet()) return Promise.resolve(true);

    return new Promise((resolve) => {
      let settled = false;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const complete = () => {
        if (settled) return;
        settled = true;
        if (timeout) clearTimeout(timeout);
        this.audibleWaiters.delete(complete);
        resolve(!this.isQuiet());
      };

      this.audibleWaiters.add(complete);
      timeout = setTimeout(complete, Math.max(0, timeoutMs));
    });
  }

  private releaseAudibleWaiters(): void {
    if (this.isQuiet()) return;
    const waiters = Array.from(this.audibleWaiters);
    for (const release of waiters) release();
  }
}

export const speechCoordinator = new SpeechCoordinator();

export function voiceAnnounce(
  message: string,
  key = `voice:${message}`,
  priority: SpeechPriority = "session",
): Promise<void> {
  if (speechCoordinator.isQuiet() || speechCoordinator.isScreenReaderEnabled()) {
    return Promise.resolve();
  }
  speechCoordinator.reset(key);
  return speechCoordinator.announce({ key, text: message, priority });
}
