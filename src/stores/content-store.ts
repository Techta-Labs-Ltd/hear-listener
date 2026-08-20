import { create } from "zustand";
import { stories as initialStories, topics as initialTopics, entities as initialEntities } from "@/data/catalogue";
import { defaultHistoryGroups } from "@/data/history";
import type { ContentState } from "@/types";

export const useContentStore = create<ContentState>((set, get) => ({
  stories: initialStories,
  topics: initialTopics,
  entities: initialEntities,
  history: defaultHistoryGroups,
  loading: false,
  refreshing: false,
  error: null,

  fetchCatalogue: async () => {
    set({ loading: true, error: null });
    try {
      await new Promise((resolve) => setTimeout(resolve, 350));
      set({
        stories: initialStories,
        topics: initialTopics,
        entities: initialEntities,
        history: defaultHistoryGroups,
        loading: false,
      });
    } catch {
      set({ loading: false, error: "Failed to load catalogue" });
    }
  },

  refresh: async () => {
    set({ refreshing: true });
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      set({
        stories: initialStories,
        topics: initialTopics,
        entities: initialEntities,
        refreshing: false,
      });
    } catch {
      set({ refreshing: false });
    }
  },

  clearHistory: () => {
    set({ history: [] });
  },

  getStoryById: (id: string) => {
    return get().stories.find((item) => item.id === id);
  },

  getStoriesByTopic: (topicId: string) => {
    return get().stories.filter((item) => item.topicIds?.includes(topicId));
  },

  getStoriesByEntity: (entityName: string) => {
    return get().stories.filter((item) => item.creator === entityName);
  },
}));

export function useContent() {
  return useContentStore();
}
