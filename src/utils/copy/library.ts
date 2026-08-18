export const libraryCopy = {
  eyebrow: "YOUR AUDIO",
  title: "Library",
  settingsLabel: "Open settings",
  savedSection: "Saved and followed",
  offlineSection: "Offline and recent",
  savedRowDetail: "stories",
  syncTitle: "Your local audio is safe.",
  syncDescription: "We couldn’t refresh your account.",
  syncRetry: "Try again",
  back: "Back to library",
  unfollow: "Unfollow",
} as const;

export const librarySectionCopy = {
  saved: {
    eyebrow: "YOUR AUDIO",
    title: "Saved audio",
    emptyTitle: "Nothing saved yet",
    emptyDescription:
      "Save a story while it plays, or say “Save this” from any screen.",
    browse: "Browse stories",
    tryVoice: "Try voice command",
  },
  following: {
    eyebrow: "YOUR AUDIO",
    title: "Following",
    subtitle: "Creators and publications",
    emptyTitle: "No followed sources",
    emptyDescription: "Say “follow” followed by a creator or publication name.",
    voiceEyebrow: "VOICE",
    voiceText: "“Unfollow Culture Weekly.”",
  },
  downloads: {
    eyebrow: "YOUR AUDIO",
    title: "Downloads",
    emptyTitle: "No downloads yet",
    emptyDescription:
      "Download a story to keep listening when you are offline.",
    voiceEyebrow: "VOICE AVAILABLE OFFLINE",
    voiceText: "Say “Play my downloads.”",
  },
  history: {
    eyebrow: "YOUR AUDIO",
    title: "Listening history",
    emptyTitle: "No listening history",
    emptyDescription: "Stories you play will appear here automatically.",
    clear: "Clear history…",
  },
} as const;
