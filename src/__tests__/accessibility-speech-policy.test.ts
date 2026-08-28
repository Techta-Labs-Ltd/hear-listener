import { AccessibilityInfo } from "react-native";
import { accessibilitySpeechPolicy } from "@/services/accessibility/accessibility-speech-policy";
import { speechCoordinator } from "@/services/voice/speech-coordinator";
import { ukSpeech } from "@/services/voice/speech";

jest.mock("react-native", () => ({
  AccessibilityInfo: {
    isScreenReaderEnabled: jest.fn().mockResolvedValue(false),
    isReduceMotionEnabled: jest.fn().mockResolvedValue(false),
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    announceForAccessibility: jest.fn(),
    announceForAccessibilityWithOptions: jest.fn(),
  },
  Platform: {
    OS: "android",
    select: (obj: any) => obj.android ?? obj.default,
  },
}));

jest.mock("@/services/voice/speech", () => ({
  ukSpeech: {
    speak: jest.fn().mockResolvedValue("DONE"),
    stop: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("accessibility-speech-policy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    accessibilitySpeechPolicy.setScreenReaderEnabled(false);
    accessibilitySpeechPolicy.setSpokenNavigationEnabled(true);
    accessibilitySpeechPolicy.setVoiceCaptureActive(false);
  });

  it("permits Hear TTS when screen reader is OFF and spoken guidance is ON", () => {
    const policy = accessibilitySpeechPolicy.getPolicy();
    expect(policy.screenReaderEnabled).toBe(false);
    expect(policy.spokenNavigationEnabled).toBe(true);
    expect(policy.voiceCaptureActive).toBe(false);
    expect(policy.canUseHearTts).toBe(true);
  });

  it("suppresses Hear TTS when screen reader is ON", () => {
    accessibilitySpeechPolicy.setScreenReaderEnabled(true);
    const policy = accessibilitySpeechPolicy.getPolicy();
    expect(policy.screenReaderEnabled).toBe(true);
    expect(policy.canUseHearTts).toBe(false);
    expect(speechCoordinator.isScreenReaderEnabled()).toBe(true);
  });

  it("suppresses Hear TTS when voice capture is ACTIVE", () => {
    accessibilitySpeechPolicy.setVoiceCaptureActive(true);
    const policy = accessibilitySpeechPolicy.getPolicy();
    expect(policy.voiceCaptureActive).toBe(true);
    expect(policy.canUseHearTts).toBe(false);
    expect(policy.suppressDynamicAccessibility).toBe(true);
    expect(speechCoordinator.isQuiet()).toBe(true);
  });

  it("speaks guided onboarding instructions before spoken guidance is enabled", async () => {
    accessibilitySpeechPolicy.setSpokenNavigationEnabled(false);

    await accessibilitySpeechPolicy.announceGuidedInstruction(
      "Welcome to Hear!",
      "onboarding:welcome",
    );

    expect(ukSpeech.speak).toHaveBeenCalledWith("Welcome to Hear!", {
      interrupt: true,
    });
  });

  it("leaves guided onboarding instructions to the native screen reader", async () => {
    accessibilitySpeechPolicy.setScreenReaderEnabled(true);

    await accessibilitySpeechPolicy.announceGuidedInstruction(
      "Welcome to Hear!",
      "onboarding:welcome",
    );

    expect(ukSpeech.speak).not.toHaveBeenCalled();
  });

  it("rate limits and deduplicates critical accessibility announcements", () => {
    accessibilitySpeechPolicy.announceCriticalAccessibility("Microphone error");
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(1);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      "Microphone error",
    );

    // Immediate duplicate call within 3s is dropped
    accessibilitySpeechPolicy.announceCriticalAccessibility("Microphone error");
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(1);

    // Different message is allowed
    accessibilitySpeechPolicy.announceCriticalAccessibility("Storage full");
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(2);
  });
});
