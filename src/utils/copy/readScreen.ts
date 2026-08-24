import { stories, topics } from "@/data/catalogue";
import type { OnboardingStepReadout, PlaybackSnapshot, Preferences } from "@/types";
import { parseLibrarySection } from "@/navigation/routes";
import { formatClock } from "@/utils/text";

type ReadoutContext = {
  pathname: string;
  playback: Pick<PlaybackSnapshot, "current" | "playing" | "progress" | "speed">;
  preferences: Preferences;
  onboardingStep?: OnboardingStepReadout;
  screenReaderEnabled?: boolean;
};

const KINETIC_VOICE_HINT = "Tilt right for next, tilt left for previous, or shake to speak.";
const SCREEN_READER_HINT =
  "Use the Start voice command accessibility action to speak.";

export function buildScreenReadout(context: ReadoutContext): string {
  const { playback } = context;
  const base = routeReadout(context);
  const playing = playback.current
    ? ` Now playing: ${playback.current.title}${
        playback.playing ? "" : ", paused"
      }.`
    : "";
  const voiceHint = context.screenReaderEnabled
    ? SCREEN_READER_HINT
    : KINETIC_VOICE_HINT;
  return `${base}${playing} ${voiceHint}`;
}

function routeReadout(context: ReadoutContext): string {
  if (context.pathname === "/onboarding") return onboardingReadout(context);
  if (context.pathname === "/player") return playerReadout(context);
  if (context.pathname === "/settings") return "Settings. Connections, voice and audio, accessibility, local area and privacy.";
  if (context.pathname.startsWith("/topic/")) return topicReadout(context);
  if (context.pathname.startsWith("/library/")) return librarySectionReadout(context);
  if (context.pathname === "/library") return libraryReadout(context);
  if (context.pathname === "/explore" || context.pathname === "/discover") return discoverReadout();
  return homeReadout(context);
}

function homeReadout(context: ReadoutContext): string {
  const continueStory = stories.find((item) => item.progress !== undefined);
  const localStories = stories.filter((item) =>
    item.topicIds?.includes("local"),
  );
  const parts = ["Home."];
  if (continueStory)
    parts.push(
      `Continue listening: ${continueStory.title} by ${continueStory.creator}, ${formatClock((continueStory.progress ?? 0) * 1080)} listened.`,
    );
  parts.push(
    `Your local news: ${localStories
      .slice(0, 3)
      .map((item) => item.title)
      .join(". Next, ")}.`,
  );
  parts.push("Say play local news, or open Discover.");
  return parts.join(" ");
}

function discoverReadout(): string {
  return `Discover. ${topics.length} topics available: ${topics
    .map((item) => item.name)
    .join(", ")}. Say a topic name to browse it, or say play trending.`;
}

function libraryReadout(context: ReadoutContext): string {
  const counts = {
    saved: context.preferences.savedIds.length,
    following: context.preferences.followingIds.length,
    downloads: context.preferences.downloadedIds.length,
  };
  return `Library. ${counts.saved} saved stories, ${counts.following} followed sources, ${counts.downloads} downloads. Say open saved audio, or open downloads.`;
}

function librarySectionReadout(context: ReadoutContext): string {
  const section = parseLibrarySection(context.pathname.split("/").at(-1));
  const titles: Record<string, string> = {
    saved: "Saved audio",
    following: "People you follow",
    downloads: "Downloaded audio",
    history: "Listening history",
  };
  const counts: Record<string, number> = {
    saved: context.preferences.savedIds.length,
    following: context.preferences.followingIds.length,
    downloads: context.preferences.downloadedIds.length,
    history: 0,
  };
  const count = counts[section] ?? 0;
  return `${titles[section] ?? "Library section"}. ${count} ${count === 1 ? "item" : "items"}. Say play, or say go back.`;
}

function playerReadout(context: ReadoutContext): string {
  const { playback } = context;
  if (!playback.current)
    return "Player. Nothing is playing yet. Say play local news to start.";
  return `Now playing: ${playback.current.title}, by ${playback.current.creator}, published by ${playback.current.publication}. ${
    playback.playing ? "Playing" : "Paused"
  } at ${formatClock(playback.progress * 1080)}, speed ${playback.speed} times. Say pause, next, rewind 15 seconds, or describe this story.`;
}

function topicReadout(context: ReadoutContext): string {
  const id = context.pathname.split("/").at(-1);
  const topic = topics.find((item) => item.id === id);
  const topicStories = stories.filter((item) =>
    item.topicIds?.includes(id ?? ""),
  );
  return `Topic: ${topic?.name ?? "browse"}. ${
    topicStories.length
  } stories available: ${topicStories
    .map((item) => item.title)
    .join(". Next, ")}. Say play a title, or go back.`;
}

function onboardingReadout(context: ReadoutContext): string {
  const step = context.onboardingStep;
  if (!step)
    return "Set up Hear! Follow the spoken steps or use the visible controls.";
  const options = step.options.length
    ? ` Your options: ${step.options.join(", ")}.`
    : "";
  return `Set up Hear! Step ${step.stepIndex + 1} of ${step.totalSteps}. ${
    step.title
  }. ${step.description}.${options} Shake device to continue.`;
}
