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

  // The requested practice command is "Play my local news"
  // Allow exact variations: "play my local news", "play local news", "play the local news", "play our local news"
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
    return {
      valid: true,
      choice: "apple",
      transcript: clean,
      feedbackText: "Apple selected. Opening Apple sign-in.",
      speechText: "Apple selected. Opening Apple sign-in.",
    };
  }

  if (normalized.includes("google")) {
    return {
      valid: true,
      choice: "google",
      transcript: clean,
      feedbackText: "Google selected. Opening Google sign-in.",
      speechText: "Google selected. Opening Google sign-in.",
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

