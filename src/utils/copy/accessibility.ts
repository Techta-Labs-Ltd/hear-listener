const screenSummaries: Record<string, string> = {
  "/":
    "Home. Your available audio follows below. Continue listening appears only after you start listening to something. The bottom tabs are Home, Discover and Library. Shake device or use the voice button to give a voice command.",
  "/explore":
    "Discover. Topics are Local news, Culture, Technology, Wellbeing, Business and Sport. Editor's pick is below the topics. The bottom tabs are Home, Discover and Library.",
  "/library":
    "Library. Collections are Saved audio, People you follow, Downloaded audio and Listening history. Your offline downloads follow below. The bottom tabs are Home, Discover and Library.",
  "/settings":
    "Settings. Manage connections, voice and audio, accessibility, local area, privacy and setup. Each row announces its current value.",
  "/player":
    "Now playing. The current story title and publisher appear first. Playback controls include previous, play or pause, next, seek, speed, repeat, sleep timer and save.",
  "/onboarding":
    "Set up Hear! There are six spoken steps: welcome, microphone, speaker, local area, voice practice and summary. No typing is required. Each step announces what to do.",
};

export function getScreenSummary(pathname: string) {
  if (pathname.startsWith("/topic/"))
    return "Topic. Browse and play audio in this topic. Use Back to return to Discover.";
  if (pathname.startsWith("/library/"))
    return "Library section. Browse the available audio or use Back to return to Library.";
  return screenSummaries[pathname] ?? "Hear! The current screen is ready.";
}
