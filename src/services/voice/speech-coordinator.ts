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
  private screenReaderEnabled = false;
  lastCompletion: "DONE" | "INTERRUPTED" | "ERROR" | "TIMEOUT" = "DONE";

  setScreenReaderEnabled(enabled: boolean): void {
    this.screenReaderEnabled = enabled;
    if (enabled) {
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
    this.active = undefined;
    await ukSpeech.stop();
  }

  reset(_key?: string): void {
    this.active = undefined;
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
