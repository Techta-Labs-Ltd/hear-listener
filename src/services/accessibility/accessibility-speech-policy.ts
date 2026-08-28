import { AccessibilityInfo } from "react-native";
import { speechCoordinator } from "@/services/voice/speech-coordinator";
import type { AccessibilitySpeechPolicy } from "@/types";

class AccessibilitySpeechPolicyManager {
  private screenReaderEnabled = false;
  private spokenNavigationEnabled = true;
  private voiceCaptureActive = false;
  private lastCriticalAnnouncementAt = 0;
  private lastCriticalText = "";
  private readonly screenReaderStatusReady: Promise<void>;

  constructor() {
    this.screenReaderStatusReady = AccessibilityInfo.isScreenReaderEnabled()
      .then((enabled) => {
        this.setScreenReaderEnabled(Boolean(enabled));
      })
      .catch(() => {});

    AccessibilityInfo.addEventListener("screenReaderChanged", (enabled) => {
      this.setScreenReaderEnabled(Boolean(enabled));
    });
  }

  setScreenReaderEnabled(enabled: boolean): void {
    this.screenReaderEnabled = enabled;
    speechCoordinator.setScreenReaderEnabled(enabled);
  }

  setSpokenNavigationEnabled(enabled: boolean): void {
    this.spokenNavigationEnabled = enabled;
  }

  setVoiceCaptureActive(active: boolean): void {
    this.voiceCaptureActive = active;
    if (active) {
      speechCoordinator.enterQuietMode();
    } else {
      speechCoordinator.exitQuietMode();
    }
  }

  getPolicy(): AccessibilitySpeechPolicy {
    return {
      screenReaderEnabled: this.screenReaderEnabled,
      spokenNavigationEnabled: this.spokenNavigationEnabled,
      voiceCaptureActive: this.voiceCaptureActive,
      canUseHearTts:
        !this.screenReaderEnabled &&
        this.spokenNavigationEnabled &&
        !this.voiceCaptureActive,
      canUseRoutineNativeAnnouncement: false,
      suppressDynamicAccessibility: this.voiceCaptureActive,
    };
  }

  async announceAppSpeech(
    message: string,
    key = `app:${message}`,
  ): Promise<void> {
    const policy = this.getPolicy();
    if (!policy.canUseHearTts) return;
    await speechCoordinator.announce({
      key,
      text: message,
      priority: "screen",
    });
  }

  async announceGuidedInstruction(
    message: string,
    key = `instruction:${message}`,
  ): Promise<void> {
    if (!message.trim()) return;

    await this.screenReaderStatusReady;
    if (this.screenReaderEnabled) return;

    await speechCoordinator.announce({
      key,
      text: message,
      priority: "screen",
      force: true,
    });
  }

  announceCriticalAccessibility(message: string): void {
    if (!message.trim()) return;
    const now = Date.now();
    if (
      this.lastCriticalText === message &&
      now - this.lastCriticalAnnouncementAt < 3000
    ) {
      return;
    }
    this.lastCriticalAnnouncementAt = now;
    this.lastCriticalText = message;
    try {
      AccessibilityInfo.announceForAccessibility(message);
    } catch {}
  }
}

export const accessibilitySpeechPolicy =
  new AccessibilitySpeechPolicyManager();
