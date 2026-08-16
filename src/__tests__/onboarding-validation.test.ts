import { isOnboardingChapterValid } from "@/validation/onboarding-validation";
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
});
