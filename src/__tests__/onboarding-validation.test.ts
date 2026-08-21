import {
  isOnboardingChapterValid,
  validateAccountChoice,
  validateVoiceTestCommand,
} from "@/validation/onboarding-validation";
import type { OnboardingValidationState } from "@/types";

const idle: OnboardingValidationState = {
  voiceStatus: "idle",
  soundStatus: "idle",
  locationStatus: "idle",
  town: "",
};

describe("onboarding validation", () => {
  it("requires an interaction choice in the welcome chapter", () => {
    expect(isOnboardingChapterValid("welcome", idle)).toBe(false);
    expect(isOnboardingChapterValid("welcome", { ...idle, guidanceChoice: "spoken" })).toBe(true);
  });

  it("allows optional voice and sound setup when idle or skipped", () => {
    expect(isOnboardingChapterValid("voiceExperience", idle)).toBe(true);
    expect(isOnboardingChapterValid("voiceExperience", { ...idle, voiceStatus: "skipped", soundStatus: "skipped" })).toBe(true);
  });

  it("blocks navigation while a capability request is active", () => {
    expect(isOnboardingChapterValid("voiceExperience", { ...idle, voiceStatus: "requesting" })).toBe(false);
    expect(isOnboardingChapterValid("voiceExperience", { ...idle, soundStatus: "requesting" })).toBe(false);
    expect(isOnboardingChapterValid("ready", { ...idle, locationStatus: "requesting" })).toBe(false);
  });

  it("requires a meaningful town only when one is entered", () => {
    expect(isOnboardingChapterValid("ready", { ...idle, town: "Y" })).toBe(false);
    expect(isOnboardingChapterValid("ready", { ...idle, town: "York" })).toBe(true);
  });

  describe("validateVoiceTestCommand", () => {
    it("approves exact and close variations of 'Play my local news'", () => {
      expect(validateVoiceTestCommand("Play my local news").valid).toBe(true);
      expect(validateVoiceTestCommand("play local news").valid).toBe(true);
      expect(validateVoiceTestCommand("play the local news").valid).toBe(true);
      expect(validateVoiceTestCommand("local news").valid).toBe(true);
    });

    it("rejects non-matching commands and provides specific speech with requested command", () => {
      const result = validateVoiceTestCommand("play my sports news");
      expect(result.valid).toBe(false);
      expect(result.transcript).toBe("play my sports news");
      expect(result.feedbackText).toContain("Say “Play my local news.”");
      expect(result.speechText).toContain("play my sports news");
      expect(result.speechText).toContain("Play my local news");
    });

    it("rejects other different commands", () => {
      const result = validateVoiceTestCommand("what is the weather");
      expect(result.valid).toBe(false);
      expect(result.feedbackText).toContain("Say “Play my local news.”");
      expect(result.speechText).toContain("Play my local news");
    });

    it("handles empty speech with retry prompt", () => {
      const result = validateVoiceTestCommand("");
      expect(result.valid).toBe(false);
      expect(result.speechText).toContain("I didn't hear anything");
      expect(result.speechText).toContain("Play my local news");
    });
  });

  describe("validateAccountChoice", () => {
    it("approves valid account choices", () => {
      expect(validateAccountChoice("apple", "ios").valid).toBe(true);
      expect(validateAccountChoice("google", "android").valid).toBe(true);
      expect(validateAccountChoice("not now", "ios").valid).toBe(true);
      expect(validateAccountChoice("skip", "android").valid).toBe(true);
    });

    it("rejects non-matching choices and provides feedback on what was heard and requested", () => {
      const result = validateAccountChoice("play my sports news", "ios");
      expect(result.valid).toBe(false);
      expect(result.speechText).toContain("play my sports news");
      expect(result.speechText).toContain("Apple, or Not now");
    });
  });
});
