import type {
  VoiceScreenContext,
  VoiceScreenDefinition,
} from "@/types";
import { buildScreenReadout } from "@/utils/copy/readScreen";

const definitions: VoiceScreenDefinition<VoiceScreenContext>[] = [
  definition("onboarding", "Setup", (path) => path === "/onboarding", "Setup. Follow the spoken instructions.", ["continue", "go back"]),
  definition("player", "Player", (path) => path === "/player", "Player. Say pause, resume, skip, change speed, or read this screen.", ["pause", "skip forward", "change speed", "read this screen"]),
  definition("settings", "Settings", (path) => path === "/settings", "Settings. Say change accessibility, change location, set up Hear again, or read this screen.", ["change accessibility", "change location", "set up Hear again", "read this screen"]),
  definition("topic", "Topic", (path) => path.startsWith("/topic/"), "Topic. Say play a story, go back, or read this screen.", ["play this story", "go back", "read this screen"]),
  definition("librarySection", "Library section", (path) => path.startsWith("/library/"), "Library section. Say play, go back, or read this screen.", ["play", "go back", "read this screen"]),
  definition("library", "Library", (path) => path === "/library", "Library. Say open downloads, open saved audio, or read this screen.", ["open downloads", "open saved audio", "read this screen"]),
  definition("discover", "Discover", (path) => path === "/explore" || path === "/discover", "Discover. Say a topic, play trending, search for audio, or read this screen.", ["open technology", "play trending", "search for local news", "read this screen"]),
  definition("home", "Home", () => true, "Home. Say play local news, open Discover, open Library, or read this screen.", ["play local news", "open Discover", "open Library", "read this screen"]),
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

export function getVoiceScreenDefinition(pathname: string) {
  return definitions.find((item) => item.matches(pathname)) ?? definitions.at(-1)!;
}

export function buildScreenOrientation(context: VoiceScreenContext): string {
  return getVoiceScreenDefinition(context.pathname).orientation(context);
}

export function getScreenCommandExamples(pathname: string): readonly string[] {
  return getVoiceScreenDefinition(pathname).commands.map((item) => item.phrase);
}

export const voiceScreenDefinitions = definitions;
