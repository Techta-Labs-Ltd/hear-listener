import type { AudioSource } from "expo-audio";

export type Topic = { id: string; name: string; description: string };
export type EntityKind = "creator" | "organisation" | "publication";
export type Entity = {
  id: string;
  name: string;
  kind: EntityKind;
  description?: string;
};
export type ContentItem = {
  id: string;
  title: string;
  creator: string;
  publication: string;
  duration: string;
  category: string;
  color: string;
  description?: string;
  topicIds?: string[];
  progress?: number;
  downloaded?: boolean;
  audioUrl?: AudioSource;
  audioDurationSeconds?: number;
};
export type LibrarySection = "saved" | "following" | "downloads" | "history";
