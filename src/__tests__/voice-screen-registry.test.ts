import {
  buildScreenOrientation,
  getScreenCommandExamples,
  getVoiceScreenDefinition,
  voiceScreenDefinitions,
} from "@/navigation/voice-screen-registry";
import { initialPreferences } from "@/stores/preferences-store";

const context = {
  pathname: "/library",
  playback: {
    current: undefined,
    playing: false,
    progress: 0,
    speed: 1 as const,
  },
  preferences: initialPreferences,
};

describe("voice screen registry", () => {
  it("provides concise orientation and detailed command help for every primary screen", () => {
    const paths = ["/(tabs)", "/explore", "/library", "/player", "/settings", "/onboarding"];
    for (const pathname of paths) {
      const definition = getVoiceScreenDefinition(pathname);
      expect(definition.orientation({ ...context, pathname })).toMatch(/\.$/);
      expect(definition.commands.length).toBeGreaterThan(0);
    }
  });

  it("keeps automatic orientation concise and exposes contextual examples", () => {
    expect(buildScreenOrientation(context)).toBe(
      "Library. Say open downloads, open saved audio, or read this screen.",
    );
    expect(getScreenCommandExamples("/library")).toContain("open downloads");
  });

  it("contains unique screen identifiers", () => {
    const ids = voiceScreenDefinitions.map((definition) => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
