export const SCREEN_IDLE_TIMEOUT_1 = 15000;
export const SCREEN_IDLE_TIMEOUT_2 = 35000;

export const SCREEN_IDLE_HINTS: Record<string, string> = {
  "/": "Still on Home. Shake device to speak. You can say Play local news, or open Discover.",
  "/index": "Still on Home. Shake device to speak. You can say Play local news, or open Discover.",
  "/home": "Still on Home. Shake device to speak. You can say Play local news, or open Discover.",
  "/discover": "Still on Discover. Shake device to speak. You can say a topic name, or say play trending.",
  "/explore": "Still on Discover. Shake device to speak. You can say a topic name, or say play trending.",
  "/library": "Still on Library. Shake device to speak. You can say open saved audio, or open downloads.",
  "/player": "Still on Player. Shake device to speak. You can say pause, next, rewind 15 seconds, or describe this story.",
  "/settings": "Still on Settings. Shake device to speak. You can say open accessibility, or open privacy.",
};

export const SCREEN_IDLE_HINTS_2: Record<string, string> = {
  "/": "When you're ready, shake device to speak.",
  "/index": "When you're ready, shake device to speak.",
  "/home": "When you're ready, shake device to speak.",
  "/discover": "When you're ready, shake device to search or browse.",
  "/explore": "When you're ready, shake device to search or browse.",
  "/library": "When you're ready, shake device to explore your library.",
  "/player": "When you're ready, shake device to control playback.",
  "/settings": "When you're ready, shake device to adjust settings.",
};

export const ONBOARDING_IDLE_HINTS = {
  welcome: "Shake device to continue.",
  permissionIntro: "Voice access. Shake device to request microphone permission.",
  permissionDenied: "Microphone access is off. Shake device to open Settings.",
  permissionBlocked: "Microphone access is off. Shake device to open Settings.",
  voiceTestError: "Shake your device to try the voice test again.",
  account: "Optional account. Say Apple, or Not now.",
  accountIos: "Optional account. Say Apple, or Not now.",
  accountOther: "Optional account. Say Google, or Not now.",
} as const;

export const ONBOARDING_IDLE_HINTS_2 = {
  welcome: "When you're ready, shake device to continue.",
  permissionIntro: "When you're ready, shake device to continue.",
  permissionDenied: "When you're ready, shake device to open Settings.",
  permissionBlocked: "When you're ready, shake device to open Settings.",
  voiceTestError: "When you're ready, shake your device to try again.",
  account: "When you're ready, say Apple, or Not now.",
  accountIos: "When you're ready, say Apple, or Not now.",
  accountOther: "When you're ready, say Google, or Not now.",
} as const;
