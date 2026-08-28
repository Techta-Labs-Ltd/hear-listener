import type { Href } from "expo-router";
import type { LibrarySection, SettingsSection } from "@/types";
import { librarySections } from "@/constants/library";

export const routes = {
  home: "/(tabs)",
  discover: "/explore",
  library: "/library",
  onboarding: "/onboarding",
  player: "/player",
  queue: "/player/queue",
  sleepTimer: "/player/sleep-timer",
  settings: "/settings",
} as const satisfies Record<string, Href>;

export function librarySectionRoute(section: LibrarySection): Href {
  return { pathname: "/(tabs)/library/[section]", params: { section } };
}
export function topicRoute(id: string): Href {
  return { pathname: "/topic/[id]", params: { id } } as Href;
}

export function settingsSectionRoute(
  section: SettingsSection,
  item?: string,
): Href {
  return {
    pathname: routes.settings,
    params: item ? { section, item } : { section },
  };
}

export function parseLibrarySection(value?: string): LibrarySection {
  return librarySections.includes(value as LibrarySection)
    ? (value as LibrarySection)
    : "saved";
}
