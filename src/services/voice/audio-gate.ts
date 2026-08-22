import type { VoiceAudioGate } from "@/types";

export type { VoiceAudioGate };

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
