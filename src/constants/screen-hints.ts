export const SCREEN_IDLE_TIMEOUT = 14000;

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

export const ONBOARDING_IDLE_HINTS = {
  welcome: "Welcome to Hear. No action detected. Double-tap anywhere to continue.",
  permissionIntro: "Voice access. Double-tap anywhere to request microphone permission.",
  permissionDenied: "Microphone access is off. Double-tap anywhere to open Settings.",
  permissionBlocked: "Microphone access is off. Double-tap anywhere to open Settings.",
  voiceTestError: "Double-tap anywhere to try the voice test again.",
  account: "Optional account. Say Apple, Google, or Not now.",
} as const;
