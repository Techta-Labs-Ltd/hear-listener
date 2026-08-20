import { onboardingCopy } from "@/utils/copy/onboarding";

export const onboardingChapters = onboardingCopy.chapters;

export const ONBOARDING_SPEECH = {
  welcome:
    "Welcome to Hear. Hear reads the app aloud and lets you control listening with short voice commands. Double-tap anywhere to begin voice setup.",
  access:
    "Voice access. Hear listens only after you call it. One command at a time, and the microphone is never left running. Double-tap to show microphone access, then choose Allow in your phone's permission dialog.",
  test: "Listening. Speak naturally. Say: Play my local news. Say cancel to stop.",
  account:
    "Optional account. Keep your listening with you. Say Apple, Google, or Not now.",
} as const;
