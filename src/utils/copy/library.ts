export const libraryCopy = {
  eyebrow: "YOUR AUDIO",
  title: "Library",
  offlineEyebrow: "READY OFFLINE",
  offlineTitle: "Your downloads",
  emptyDownloadsTitle: "No downloads yet",
  emptyDownloadsDescription:
    "Download a story to keep listening when you are offline.",
  unfollow: "Unfollow",
  back: "Back to library",
} as const;

export const librarySectionCopy = {
  saved: {
    eyebrow: "YOUR AUDIO",
    title: "Saved audio",
    emptyTitle: "Nothing saved yet",
    emptyDescription:
      "Say “save this” while listening, or save a story from its player.",
  },
  following: {
    eyebrow: "PEOPLE AND PUBLICATIONS",
    title: "People you follow",
    emptyTitle: "No followed sources",
    emptyDescription: "Say “follow” followed by a creator or publication name.",
  },
  downloads: {
    eyebrow: "READY OFFLINE",
    title: "Downloaded audio",
    emptyTitle: "No downloads yet",
    emptyDescription:
      "Say “download this” while listening to keep a story offline.",
  },
  history: {
    eyebrow: "RECENTLY PLAYED",
    title: "Listening history",
    emptyTitle: "No listening history",
    emptyDescription: "Stories you play will appear here automatically.",
  },
} as const;
