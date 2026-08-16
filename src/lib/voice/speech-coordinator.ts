import { AccessibilityInfo } from "react-native";
import { usePreferencesStore } from "@/stores";
import { ukSpeech } from "./speech";

export type SpeechPriority = "screen" | "instruction" | "session";

export type SpeechRequest = {
  key: string;
  text: string;
  priority?: SpeechPriority;
};

const priorityRank: Record<SpeechPriority, number> = {
  screen: 1,
  instruction: 2,
  session: 3,
};

class SpeechCoordinator {
  private delivered = new Set<string>();
  private active?: { key: string; priority: SpeechPriority };

  async speak(request: SpeechRequest): Promise<void> {
    if (!request.text.trim() || this.delivered.has(request.key)) return;
    const priority = request.priority ?? "screen";
    if (
      this.active &&
      priorityRank[this.active.priority] > priorityRank[priority]
    ) {
      return;
    }

    this.delivered.add(request.key);
    this.active = { key: request.key, priority };
    try {
      const screenReaderEnabled =
        await AccessibilityInfo.isScreenReaderEnabled();
      if (screenReaderEnabled) {
        await ukSpeech.stop();
        AccessibilityInfo.announceForAccessibility(request.text);
        return;
      }
      if (!usePreferencesStore.getState().spokenGuidanceEnabled) return;
      await ukSpeech.speak(request.text);
    } finally {
      if (this.active?.key === request.key) this.active = undefined;
    }
  }

  announce(request: SpeechRequest): Promise<void> {
    return this.speak(request);
  }

  async cancel(scope?: string): Promise<void> {
    await ukSpeech.stop();
    this.active = undefined;
    if (!scope) return;
    for (const key of this.delivered) {
      if (key.startsWith(scope)) this.delivered.delete(key);
    }
  }

  reset(key: string): void {
    this.delivered.delete(key);
  }
}

export const speechCoordinator = new SpeechCoordinator();
