import type { OnboardingChapterId, OnboardingValidationState } from "@/types";

export function isOnboardingChapterValid(chapterId: OnboardingChapterId, state: OnboardingValidationState) {
  if (chapterId === "welcome") return Boolean(state.guidanceChoice);
  if (chapterId === "voiceExperience") {
    return state.voiceStatus !== "requesting" && state.soundStatus !== "requesting";
  }
  if (state.locationStatus === "requesting") return false;
  return state.town.length === 0 || state.town.trim().length >= 2;
}
