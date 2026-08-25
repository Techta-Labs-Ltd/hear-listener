import type { BiasTermInput, BiasTermSource } from "@/types";

export const SAFE_FILLER_PHRASES = [
  "um",
  "umm",
  "uh",
  "uhh",
  "erm",
  "hmm",
  "ah",
  "okay",
  "ok",
  "please",
  "please can you",
  "can you",
  "could you",
  "would you",
  "i mean",
  "you know",
  "actually",
  "basically",
  "for me please",
] as const;

export const LOCAL_COMMAND_DICTIONARY: Record<string, string[]> = {
  pause: [
    "pause",
    "pause it",
    "pause this",
    "pause audio",
    "pause the audio",
    "stop audio",
    "hold on",
  ],
  resume: [
    "resume",
    "continue",
    "carry on",
    "keep playing",
    "keep going",
    "unpause",
    "play",
  ],
  next: ["next", "next story", "skip", "skip story", "next track", "skip this"],
  previous: ["previous", "previous story", "previous track", "go back a story"],
  restart: ["restart", "start over", "start again", "from the beginning"],
  "navigate:home": [
    "home",
    "go home",
    "take me home",
    "go to home",
    "home screen",
  ],
  "navigate:library": [
    "open library",
    "library",
    "my library",
    "go to my library",
    "take me to my library",
  ],
  "navigate:discover": ["open discover", "discover", "explore", "open explore"],
  "navigate:settings": ["open settings", "settings"],
  "navigate:player": ["open player", "show player", "player", "open the player"],
  "openLibrarySection:saved": [
    "open saved",
    "open saved audio",
    "saved audio",
    "my saved audio",
    "open my saved",
  ],
  "openLibrarySection:downloads": [
    "open downloads",
    "downloads",
    "my downloads",
    "open my downloads",
  ],
  "openLibrarySection:history": [
    "open history",
    "history",
    "my history",
    "open my history",
  ],
  "openLibrarySection:following": [
    "open following",
    "following",
    "open followed sources",
  ],
  openQueue: ["open queue", "show queue", "queue"],
  clearQueue: ["clear queue", "empty the queue"],
  readScreen: [
    "read screen",
    "read this screen",
    "read the screen",
    "what is on this screen",
    "whats on this screen",
    "read it to me",
  ],
  help: [
    "help",
    "voice help",
    "what can i say",
    "what can you do",
    "what can i ask",
    "commands",
    "show commands",
    "what are the commands",
  ],
  close: ["back", "go back", "previous screen"],
  cancel: [
    "cancel",
    "never mind",
    "forget it",
    "dismiss",
    "close",
    "close voice",
    "go away",
  ],
  saveCurrent: ["save this", "save current", "save this audio", "save it"],
  removeSaved: ["remove from saved", "unsave this", "remove this from saved"],
  downloadCurrent: ["download this", "download this audio", "download it"],
  removeDownload: ["remove this download", "remove download"],
  addToQueue: ["add this to queue", "queue this", "add to queue"],
  openAppSettings: [
    "open app settings",
    "app settings",
    "privacy settings",
    "permission settings",
  ],
  openAudioSettings: [
    "open audio settings",
    "audio settings",
    "audio output",
    "sound settings",
  ],
  openBluetoothSettings: [
    "open bluetooth settings",
    "bluetooth settings",
    "bluetooth",
    "hearing device settings",
    "pair my hearing device",
  ],
  openInternetSettings: [
    "open internet settings",
    "internet settings",
    "network settings",
  ],
  openWifiSettings: [
    "open wifi settings",
    "wifi settings",
    "wi fi settings",
    "wireless settings",
    "wifi setting",
  ],
  openAccessibilitySettings: [
    "open accessibility settings",
    "accessibility settings",
    "screen reader settings",
  ],
  openLocationSettings: [
    "open location settings",
    "location settings",
    "location services",
    "local area settings",
  ],
  resetVoiceCorrections: [
    "reset voice corrections",
    "reset learned corrections",
    "reset learned voice corrections",
    "forget voice corrections",
  ],
  "repeat:on": ["repeat", "turn repeat on", "repeat on", "repeat it", "play it again"],
  "repeat:off": ["turn repeat off", "repeat off", "stop repeating"],
  cancelSleepTimer: [
    "cancel sleep timer",
    "stop the sleep timer",
    "turn off the sleep timer",
  ],
  "speedStep:up": ["speed up", "faster", "speed faster", "go faster"],
  "speedStep:down": ["slow down", "slower", "speed slower", "go slower"],
  accountSignIn: [
    "sign in",
    "continue with google",
    "sign in with google",
    "continue with apple",
    "sign in with apple",
  ],
  accountSignOut: ["sign out"],
  onboardingContinue: ["continue", "continue setup", "next step"],
  onboardingBack: ["back", "go back", "previous step", "go back a step"],
  onboardingSkip: ["skip", "skip this step", "skip this"],
  onboardingRead: ["read this step", "read step", "read setup", "read the step"],
  onboardingPlaySoundCheck: ["play sound check", "play the sound check", "sound check"],
  onboardingUseSpokenSetup: ["use spoken setup", "spoken setup"],
  onboardingUseScreenControls: ["use screen controls", "screen controls"],
  onboardingUseLocation: ["use my location", "use location", "yes use location"],
  onboardingCannotHear: ["i cannot hear it", "i cant hear it", "cannot hear", "cant hear"],
};

export const BIAS_SOURCE_SCORES: Record<BiasTermSource, number> = {
  "active-entity": 100,
  "ambiguity-candidate": 95,
  "current-publication": 90,
  "current-organization": 85,
  "current-creator": 80,
  "visible-result": 70,
  "recently-played": 55,
  "recently-searched": 45,
  popular: 20,
};

export function rankBiasTerms(
  inputs: BiasTermInput[],
  limit: number,
): string[] {
  const best = new Map<string, BiasTermInput>();
  for (const input of inputs) {
    const normalized = input.term.trim().toLowerCase();
    if (!normalized) continue;
    const existing = best.get(normalized);
    if (
      !existing ||
      BIAS_SOURCE_SCORES[input.source] > BIAS_SOURCE_SCORES[existing.source]
    ) {
      best.set(normalized, input);
    }
  }
  return [...best.values()]
    .sort((left, right) => {
      const scoreDifference =
        BIAS_SOURCE_SCORES[right.source] - BIAS_SOURCE_SCORES[left.source];
      if (scoreDifference !== 0) return scoreDifference;
      return left.term.length - right.term.length;
    })
    .slice(0, limit)
    .map((item) => item.term.trim());
}
