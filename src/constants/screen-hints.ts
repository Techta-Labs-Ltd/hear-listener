export const SCREEN_IDLE_TIMEOUT_1 = 15000;
export const SCREEN_IDLE_TIMEOUT_2 = 35000;

export const SCREEN_IDLE_HINTS: Record<string, string> = {
  "/": "Still on Home. Double-tap anywhere to speak. You can say Play local news, or open Discover.",
  "/index": "Still on Home. Double-tap anywhere to speak. You can say Play local news, or open Discover.",
  "/home": "Still on Home. Double-tap anywhere to speak. You can say Play local news, or open Discover.",
  "/discover": "Still on Discover. Double-tap anywhere to speak. You can say a topic name, or say play trending.",
  "/explore": "Still on Discover. Double-tap anywhere to speak. You can say a topic name, or say play trending.",
  "/library": "Still on Library. Double-tap anywhere to speak. You can say open saved audio, or open downloads.",
  "/player": "Still on Player. Double-tap anywhere to speak. You can say pause, next, rewind 15 seconds, or describe this story.",
  "/settings": "Still on Settings. Double-tap anywhere to speak. You can say open accessibility, or open privacy.",
};

export const SCREEN_IDLE_HINTS_2: Record<string, string> = {
  "/": "When you're ready, double-tap anywhere to speak.",
  "/index": "When you're ready, double-tap anywhere to speak.",
  "/home": "When you're ready, double-tap anywhere to speak.",
  "/discover": "When you're ready, double-tap anywhere to search or browse.",
  "/explore": "When you're ready, double-tap anywhere to search or browse.",
  "/library": "When you're ready, double-tap anywhere to explore your library.",
  "/player": "When you're ready, double-tap anywhere to control playback.",
  "/settings": "When you're ready, double-tap anywhere to adjust settings.",
};

export const ONBOARDING_IDLE_HINTS = {
  welcome: "Double-tap anywhere to continue.",
  permissionIntro: "Voice access. Double-tap anywhere to request microphone permission.",
  permissionDenied: "Microphone access is off. Double-tap anywhere to open Settings.",
  permissionBlocked: "Microphone access is off. Double-tap anywhere to open Settings.",
  voiceTestError: "Double-tap anywhere to try the voice test again.",
  account: "Optional account. Say Apple, Google, or Not now.",
} as const;

export const ONBOARDING_IDLE_HINTS_2 = {
  welcome: "When you're ready, double-tap anywhere to continue.",
  permissionIntro: "When you're ready, double-tap anywhere to continue.",
  permissionDenied: "When you're ready, double-tap anywhere to open Settings.",
  permissionBlocked: "When you're ready, double-tap anywhere to open Settings.",
  voiceTestError: "When you're ready, double-tap anywhere to try again.",
  account: "When you're ready, say Apple, Google, or Not now.",
} as const;
