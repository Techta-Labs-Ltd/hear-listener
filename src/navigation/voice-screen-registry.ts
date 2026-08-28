import type {
  VoiceScreenContext,
  VoiceScreenDefinition,
} from "@/types";
import { buildScreenReadout } from "@/utils/copy/readScreen";

const voiceScreenDefinitionsInternal: VoiceScreenDefinition<VoiceScreenContext>[] = [
  definition("onboarding", "Setup", (path) => path === "/onboarding", "Setup. Follow the spoken instructions.", ["continue", "go back"]),
  definition("sleepTimer", "Sleep timer", (path) => path === "/sleep-timer" || path === "/sleep" || path === "/player/sleep-timer", "Sleep timer. Say set a timer, cancel the timer, or read this screen.", ["set a sleep timer for 20 minutes", "cancel sleep timer", "read this screen"]),
  definition("queue", "Queue", (path) => path === "/queue" || path === "/player/queue", "Queue. Say clear queue, go back, or read this screen.", ["clear queue", "go back", "read this screen"]),
  definition("search", "Search", (path) => path === "/search", "Search. Say what you want to find, or read this screen.", ["search for local news", "read this screen"]),
  definition("player", "Player", (path) => path === "/player", "Player. Say pause, resume, skip, change speed, or read this screen.", ["pause", "skip forward", "change speed", "read this screen"]),
  definition("settings", "Settings", (path) => path === "/settings" || path.startsWith("/settings/"), "Settings. Say change accessibility, change location, set up Hear! again, or read this screen.", ["change accessibility", "change location", "set up Hear! again", "read this screen"]),
  definition("topic", "Topic", (path) => path.startsWith("/topic/"), "Topic. Say play a story, go back, or read this screen.", ["play this story", "go back", "read this screen"]),
  definition("librarySection", "Library section", (path) => path.startsWith("/library/") || path.startsWith("/(tabs)/library/"), "Library section. Say play, go back, or read this screen.", ["play", "go back", "read this screen"]),
  definition("library", "Library", (path) => path === "/library" || path === "/(tabs)/library", "Library. Say open downloads, open saved audio, or read this screen.", ["open downloads", "open saved audio", "read this screen"]),
  definition("discover", "Discover", (path) => path === "/explore" || path === "/discover" || path === "/(tabs)/explore", "Discover. Say a topic, play trending, search for audio, or read this screen.", ["open technology", "play trending", "search for local news", "read this screen"]),
  definition("home", "Home", (path) => path === "/" || path === "/home" || path === "/index" || path === "/(tabs)" || path === "/(tabs)/index", "Home. Say play local news, open Discover, open Library, or read this screen.", ["play local news", "open Discover", "open Library", "read this screen"]),
];

function definition(
  id: VoiceScreenDefinition<VoiceScreenContext>["id"],
  title: string,
  matches: (pathname: string) => boolean,
  orientation: string,
  phrases: string[],
): VoiceScreenDefinition<VoiceScreenContext> {
  return {
    id,
    title,
    matches,
    orientation: () => orientation,
    readout: (context) => buildScreenReadout(context),
    commands: phrases.map((phrase) => ({ phrase, description: phrase })),
  };
}

function unknownDefinition(): VoiceScreenDefinition<VoiceScreenContext> {
  return {
    id: "unknown",
    title: "Hear! Listener",
    matches: () => true,
    orientation: () => "You are browsing Hear! Listener. Shake device to speak.",
    readout: () => "You are browsing Hear! Listener.",
    commands: [],
  };
}

export function getVoiceScreenDefinition(pathname: string) {
  return (
    voiceScreenDefinitionsInternal.find((item) => item.matches(pathname)) ??
    unknownDefinition()
  );
}

export function buildScreenOrientation(context: VoiceScreenContext): string {
  return getVoiceScreenDefinition(context.pathname).orientation(context);
}

export function getScreenCommandExamples(pathname: string): readonly string[] {
  return getVoiceScreenDefinition(pathname).commands.map((item) => item.phrase);
}

export const voiceScreenDefinitions = voiceScreenDefinitionsInternal;
