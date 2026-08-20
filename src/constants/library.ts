import type { LibrarySection } from "@/types";

export const librarySections: readonly LibrarySection[] = [
  "saved",
  "following",
  "downloads",
  "history",
];

export const librarySectionTitle: Record<LibrarySection, string> = {
  saved: "Saved audio",
  following: "People you follow",
  downloads: "Downloads",
  history: "History",
};
