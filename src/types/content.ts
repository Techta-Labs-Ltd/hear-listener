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
  origin?: "catalogue" | "hear-search";
  organization?: string;
  tags?: string[];
  publishedAt?: string;
  playbackSpeedUrls?: { speed: number; url: string }[];
};
export type LibrarySection = "saved" | "following" | "downloads" | "history";

export type HistoryItem = {
  storyId: string;
  playedMinutes: number;
  completed: boolean;
  playedAt: string;
  meta: string;
};

export type HistoryGroup = {
  label: string;
  rows: HistoryItem[];
};

export type CatalogueSearchResults = {
  audio: ContentItem[];
  shows: Entity[];
};

export type ContentState = {
  stories: ContentItem[];
  topics: Topic[];
  entities: Entity[];
  history: HistoryGroup[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  fetchCatalogue: () => Promise<void>;
  refresh: () => Promise<void>;
  clearHistory: () => void;
  getStoryById: (id: string) => ContentItem | undefined;
  getStoriesByTopic: (topicId: string) => ContentItem[];
  getStoriesByEntity: (entityName: string) => ContentItem[];
};
