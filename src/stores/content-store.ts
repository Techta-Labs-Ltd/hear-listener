import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeAsyncStorage } from "@/lib/storage";
import { searchHearCatalogue } from "@/services/content/hear-catalogue-service";
import type {
  ContentItem,
  ContentState,
  Entity,
  HistoryGroup,
  Topic,
} from "@/types";

let activeCatalogueRequest: Promise<ContentItem[]> | undefined;

async function loadLatestHearContent(): Promise<ContentItem[]> {
  activeCatalogueRequest ??= searchHearCatalogue({
    sort: "latest",
    page: 0,
    limit: 20,
  })
    .then((page) => page.items)
    .finally(() => {
      activeCatalogueRequest = undefined;
    });
  return activeCatalogueRequest;
}

export const useContentStore = create<ContentState>()(
  persist(
    (set, get) => ({
      stories: [],
      topics: [],
      entities: [],
      history: [],
      loading: false,
      refreshing: false,
      error: null,

      fetchCatalogue: async () => {
        if (get().loading || get().stories.length > 0) return;
        set({ loading: true, error: null });
        try {
          const stories = await loadLatestHearContent();
          set({
            stories,
            topics: topicsFrom(stories),
            entities: entitiesFrom(stories),
            loading: false,
          });
        } catch (error) {
          set({
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to load Hear! audio.",
          });
        }
      },

      refresh: async () => {
        if (get().refreshing) return;
        set({ refreshing: true, error: null });
        try {
          const stories = await loadLatestHearContent();
          set({
            stories,
            topics: topicsFrom(stories),
            entities: entitiesFrom(stories),
            refreshing: false,
          });
        } catch (error) {
          set({
            refreshing: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to refresh Hear! audio.",
          });
        }
      },

      clearHistory: () => set({ history: [] }),
      recordHistory: (item, playedSeconds, completed = false) =>
        set((state) => ({
          history: recordListeningHistory(
            state.history,
            item,
            playedSeconds,
            completed,
          ),
        })),

      getStoryById: (id) => get().stories.find((item) => item.id === id),

      getStoriesByTopic: (topicId) =>
        get().stories.filter((item) => item.topicIds?.includes(topicId)),

      getStoriesByEntity: (entityName) =>
        get().stories.filter(
          (item) =>
            item.creator === entityName || item.organization === entityName,
        ),
    }),
    {
      name: "hear-content-history",
      version: 1,
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: (state) => ({ history: state.history }),
    },
  ),
);

function recordListeningHistory(
  history: HistoryGroup[],
  item: ContentItem,
  playedSeconds: number,
  completed: boolean,
): HistoryGroup[] {
  const now = new Date();
  const label = "TODAY";
  const playedMinutes = Math.max(0, Math.floor(playedSeconds / 60));
  const withoutItem = history
    .map((group) => ({
      ...group,
      rows: group.rows.filter((row) => row.storyId !== item.id),
    }))
    .filter((group) => group.rows.length > 0);
  const currentGroup = withoutItem.find((group) => group.label === label);
  const row = {
    storyId: item.id,
    item,
    playedMinutes,
    completed,
    playedAt: now.toISOString(),
    meta: completed
      ? `Completed · ${item.publication}`
      : playedMinutes > 0
        ? `${playedMinutes} min played · ${item.publication}`
        : `Started · ${item.publication}`,
  };
  if (currentGroup) {
    currentGroup.rows = [row, ...currentGroup.rows];
    return withoutItem;
  }
  return [{ label, rows: [row] }, ...withoutItem];
}

function topicsFrom(stories: ContentItem[]): Topic[] {
  const topics = new Map<string, Topic>();
  for (const story of stories) {
    const id = story.categoryId ?? story.topicIds?.[0];
    if (!id || topics.has(id)) continue;
    topics.set(id, {
      id,
      name: story.category,
      description: `Latest ${story.category.toLocaleLowerCase("en-GB")} audio`,
    });
  }
  return [...topics.values()];
}

function entitiesFrom(stories: ContentItem[]): Entity[] {
  const entities = new Map<string, Entity>();
  for (const story of stories) {
    addEntity(
      entities,
      story.creatorId,
      story.creator,
      "creator",
      story.category,
    );
    addEntity(
      entities,
      story.organizationId,
      story.organization,
      "organisation",
      story.category,
    );
    addEntity(
      entities,
      story.publicationId,
      story.publication,
      "publication",
      story.category,
    );
  }
  return [...entities.values()];
}

function addEntity(
  entities: Map<string, Entity>,
  id: string | undefined,
  name: string | undefined,
  kind: Entity["kind"],
  category: string,
): void {
  if (!name) return;
  const key = id ?? `${kind}:${name.toLocaleLowerCase("en-GB")}`;
  if (entities.has(key)) return;
  entities.set(key, {
    id: key,
    name,
    kind,
    description: `${category} audio`,
  });
}

export function useContent() {
  return useContentStore();
}
