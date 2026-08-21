import { AccessibilityInfo } from "react-native";
import type { SpeechPriority, SpeechRequest } from "@/types";
import { ukSpeech } from "./speech";

const priorityRank: Record<SpeechPriority, number> = {
  screen: 1,
  instruction: 2,
  session: 3,
};

class SpeechCoordinator {
  private active?: { key: string; priority: SpeechPriority };

  async speak(request: SpeechRequest): Promise<void> {
    if (!request.text.trim()) return;
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
      void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
        if (enabled) {
          AccessibilityInfo.announceForAccessibility(request.text);
        }
      });
      await ukSpeech.speak(request.text, { interrupt: true });
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
    const key = request.key ?? `beforeListening:${request.text}`;
    this.active = { key, priority: "instruction" };
    try {
      void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
        if (enabled) {
          AccessibilityInfo.announceForAccessibility(request.text);
        }
      });
      await ukSpeech.stop();
      await ukSpeech.speak(request.text, { interrupt: true });
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
