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
    description: "Hear cannot accept microphone permission for you.",
  },
] as const;

export const onboardingCopyPresets = {
  welcome: {
    heroTitle: "Hear.",
    heroStatus: "HEAR IS SPEAKING",
    eyebrow: "WELCOME · 1 OF 3",
    title: "Hear what matters.\nSkip the screens.",
    subtitle: "Hear reads the app aloud and lets you control listening with short voice commands.",
    examplePrompt: "“Play my local news.”",
    instructionsTitle: "Double-tap anywhere",
    instructionsSubtitle: "to begin voice setup. Hear will guide you aloud.",
  },
  voiceAccess: {
    heroTitle: "Your voice stays yours.",
    heroSubtitle: "Permission first. Listening only when invited.",
    eyebrow: "VOICE ACCESS · 2 OF 3",
    title: "Hear listens only after\nyou call it.",
    instructionsTitle: "Double-tap to show microphone access",
  },
  voiceTest: {
    eyebrow: "VOICE ACCESS · 2 OF 3",
    title: "Let’s try one command.",
    subtitle: "Hear started listening after permission was allowed.",
    promptCommand: "“Play my local news.”",
  },
  account: {
    eyebrow: "OPTIONAL ACCOUNT · 3 OF 3",
    title: "Keep your listening\nwith you.",
    subtitle: "An account syncs saved audio and progress.\nHear works fully without one.",
    statusLabel: "HEAR IS LISTENING",
    voicePrompt: "Say “Apple,” “Google,” or “Not now.”",
    skipLabel: "Not now",
  },
} as const;
