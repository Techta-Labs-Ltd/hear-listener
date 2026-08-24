import type { SpeechPriority, SpeechRequest, VoiceAudioGate } from "@/types";
import { ukSpeech } from "./speech";

class AudioGateService implements VoiceAudioGate {
  private quiet = false;

  async enterQuietMode(): Promise<void> {
    this.quiet = true;
  }

  exitQuietMode(): void {
    this.quiet = false;
  }

  isQuiet(): boolean {
    return this.quiet;
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
  private quietMode = false;
  lastCompletion: "DONE" | "INTERRUPTED" | "ERROR" | "TIMEOUT" = "DONE";

  enterQuietMode(): void {
    this.quietMode = true;
    void voiceAudioGate.enterQuietMode();
    void ukSpeech.stop();
    this.active = undefined;
  }

  exitQuietMode(): void {
    this.quietMode = false;
    voiceAudioGate.exitQuietMode();
  }

  isQuiet(): boolean {
    return this.quietMode || voiceAudioGate.isQuiet();
  }

  async speak(request: SpeechRequest): Promise<void> {
    if (!request.text.trim()) return;
    if (this.isQuiet()) return;
    const priority = request.priority ?? "screen";
    if (
      this.active &&
      priorityRank[this.active.priority] > priorityRank[priority]
    ) {
      return;
    }

    const key = request.key;
    this.active = { key, priority };
    try {
      this.lastCompletion = await ukSpeech.speak(request.text, { interrupt: true });
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
  speechCoordinator.reset(key);
  return speechCoordinator.announce({ key, text: message, priority });
}
