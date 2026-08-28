export const onboardingFacts = [
  {
    title: "One command at a time",
    description: "Each listening session ends after one request.",
  },
  {
    title: "Never left running",
    description: "The microphone closes after success, cancel, or silence.",
  },
  {
    title: "Your phone asks next",
    description: "Hear! cannot accept microphone permission for you.",
  },
] as const;

export const onboardingCopyPresets = {
  welcome: {
    heroTitle: "Hear!",
    heroStatus: "HEAR IS SPEAKING",
    eyebrow: "WELCOME · 1 OF 3",
    title: "Hear! what matters.\nSkip the screens.",
    subtitle: "Hear! helps you listen and use the app without needing to see the screen.",
    examplePrompt: "“Play my local news.”",
    instructionsTitle: "Shake device",
    instructionsSubtitle: "to begin voice setup.",
  },
  voiceAccess: {
    heroTitle: "Your voice stays yours.",
    heroSubtitle: "Permission first. Listening only when invited.",
    eyebrow: "VOICE ACCESS · 2 OF 3",
    title: "Hear! listens only after\nyou call it.",
    instructionsTitle: "Shake device to allow access",
  },
  permissionDenied: {
    eyebrow: "VOICE ACCESS · 2 OF 3",
    title: "Microphone access is off.",
    subtitle: "You can open Settings or continue without voice.",
    openSettingsLabel: "Open Settings",
    continueWithoutVoiceLabel: "Continue without voice",
  },
  voiceTestReady: {
    eyebrow: "VOICE ACCESS · 2 OF 3",
    title: "Let’s try one command",
    subtitle: "Microphone access granted.",
    promptLabel: "SAY THIS",
    promptCommand: "“Play my local news.”",
    instructionsTitle: "Shake device when you're ready",
  },
  voiceTest: {
    eyebrow: "VOICE ACCESS · 2 OF 3",
    title: "Let’s try one command.",
    subtitle: "Hear! is listening for one test command.",
    promptLabel: "SAY THIS",
    promptCommand: "“Play my local news.”",
  },
  account: {
    eyebrow: "OPTIONAL ACCOUNT · 3 OF 3",
    title: "Keep your listening\nwith you.",
    subtitle: "An account syncs saved audio and progress.\nHear! works fully without one.",
    skipLabel: "Not now",
  },
} as const;
