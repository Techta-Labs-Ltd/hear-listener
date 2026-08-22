import type { OnboardingChapterId, OnboardingValidationState } from "@/types";

export function isOnboardingChapterValid(chapterId: OnboardingChapterId, state: OnboardingValidationState) {
  if (chapterId === "welcome") return Boolean(state.guidanceChoice);
  if (chapterId === "voiceExperience") {
    return state.voiceStatus !== "requesting" && state.soundStatus !== "requesting";
  }
  if (state.locationStatus === "requesting") return false;
  return state.town.length === 0 || state.town.trim().length >= 2;
}

export interface VoiceTestValidationResult {
  valid: boolean;
  transcript: string;
  feedbackText: string;
  speechText: string;
}

export function validateVoiceTestCommand(transcript: string): VoiceTestValidationResult {
  const clean = transcript.trim();
  if (!clean) {
    return {
      valid: false,
      transcript: "",
      feedbackText: "I didn't hear anything. Double-tap to try again.",
      speechText: "I didn't hear anything. Double-tap anywhere to try again. After the tone, say Play my local news.",
    };
  }

  const normalized = clean
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const isMatch =
    /^(play\s+)?(my\s+|the\s+|our\s+)?local\s+news$/.test(normalized) ||
    normalized === "play my local news" ||
    normalized === "play local news" ||
    normalized === "play the local news" ||
    normalized === "play our local news" ||
    normalized === "local news";

  if (isMatch) {
    return {
      valid: true,
      transcript: clean,
      feedbackText: "Great. I heard “Play my local news.” Voice access is working.",
      speechText: "Great. I heard “Play my local news.” Voice access is working.",
    };
  }

  return {
    valid: false,
    transcript: clean,
    feedbackText: `I heard “${clean}”. Say “Play my local news.” Double-tap to try again.`,
    speechText: `I heard “${clean}”. For this test, please say “Play my local news.” Double-tap anywhere to try again.`,
  };
}

export interface AccountChoiceValidationResult {
  valid: boolean;
  choice?: "apple" | "google" | "skip";
  transcript: string;
  feedbackText: string;
  speechText: string;
}

export function validateAccountChoice(
  transcript: string,
  platform: string,
): AccountChoiceValidationResult {
  const clean = transcript.trim();
  const isIos = platform === "ios";
  const defaultChoicesSpeech = isIos ? "Apple, or Not now" : "Google, or Not now";

  if (!clean) {
    return {
      valid: false,
      transcript: "",
      feedbackText: "I didn't hear a choice. Double-tap anywhere when you're ready.",
      speechText: `I didn't hear a choice. Double-tap anywhere to try again. Say ${defaultChoicesSpeech}.`,
    };
  }

  const normalized = clean
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.includes("apple")) {
    if (isIos) {
      return {
        valid: true,
        choice: "apple",
        transcript: clean,
        feedbackText: "Apple selected. Opening Apple sign-in.",
        speechText: "Apple selected. Opening Apple sign-in.",
      };
    }
    return {
      valid: false,
      transcript: clean,
      feedbackText: "Apple sign-in is only available on iOS. Say Google, or Not now.",
      speechText: "Apple sign-in is only available on Apple devices. On this device, please say Google, or Not now.",
    };
  }

  if (normalized.includes("google")) {
    if (!isIos) {
      return {
        valid: true,
        choice: "google",
        transcript: clean,
        feedbackText: "Google selected. Opening Google sign-in.",
        speechText: "Google selected. Opening Google sign-in.",
      };
    }
    return {
      valid: false,
      transcript: clean,
      feedbackText: "Google sign-in is not available on this screen. Say Apple, or Not now.",
      speechText: "Google sign-in is not available on this screen. Please say Apple, or Not now.",
    };
  }

  if (
    normalized.includes("not now") ||
    normalized.includes("skip") ||
    normalized.includes("no") ||
    normalized.includes("continue") ||
    normalized.includes("without account")
  ) {
    return {
      valid: true,
      choice: "skip",
      transcript: clean,
      feedbackText: "Not now selected. Setup complete. Opening Hear.",
      speechText: "Not now selected. Setup complete. Opening Hear.",
    };
  }

  return {
    valid: false,
    transcript: clean,
    feedbackText: `I heard “${clean}”. Say ${defaultChoicesSpeech}.`,
    speechText: `I heard “${clean}”. Please say ${defaultChoicesSpeech}. Double-tap anywhere to try again.`,
  };
}

