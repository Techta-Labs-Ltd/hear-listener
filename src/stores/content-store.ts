import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeAsyncStorage } from "@/lib/storage";
import { searchHearCatalogue } from "@/services/content/hear-catalogue-service";
import { EXTERNAL_VOICE_CONFIG } from "@/constants/external-voice";
import type {
  ContentItem,
  ContentState,
  Entity,
  HearCataloguePage,
  HistoryGroup,
  Topic,
} from "@/types";

const activeCatalogueRequests = new Map<number, Promise<HearCataloguePage>>();

function loadLatestHearContent(page: number): Promise<HearCataloguePage> {
  const activeRequest = activeCatalogueRequests.get(page);
  if (activeRequest) return activeRequest;

  const request = searchHearCatalogue({
    sort: "latest",
    page,
    limit: EXTERNAL_VOICE_CONFIG.cataloguePageSize,
  }).finally(() => {
    if (activeCatalogueRequests.get(page) === request) {
      activeCatalogueRequests.delete(page);
    }
  });
  activeCatalogueRequests.set(page, request);
  return request;
}

export const useContentStore = create<ContentState>()(
  persist(
    (set, get) => ({
      stories: [],
      topics: [],
      entities: [],
      history: [],
      loading: false,
      loadingMore: false,
      refreshing: false,
      initialLoadComplete: false,
      page: -1,
      pageSize: EXTERNAL_VOICE_CONFIG.cataloguePageSize,
      total: 0,
      totalPages: 0,
      remaining: 0,
      hasMore: false,
      error: null,
      loadMoreError: null,

      fetchCatalogue: async () => {
        const state = get();
        if (
          state.loading ||
          state.loadingMore ||
          state.refreshing ||
          state.stories.length > 0
        ) {
          return;
        }
        set({ loading: true, error: null, loadMoreError: null });
        try {
          const page = await loadLatestHearContent(0);
          const stories = uniqueContent(page.items);
          set({
            stories,
            topics: topicsFrom(stories),
            entities: entitiesFrom(stories),
            loading: false,
            initialLoadComplete: true,
            ...paginationState(page),
          });
        } catch (error) {
          set({
            loading: false,
            initialLoadComplete: true,
            error:
              error instanceof Error
                ? error.message
                : "Failed to load Hear! audio.",
          });
        }
      },

      loadNextPage: async () => {
        const state = get();
        if (
          state.loading ||
          state.loadingMore ||
          state.refreshing ||
          !state.hasMore
        ) {
          return;
        }
        const requestedPage = state.page + 1;
        set({ loadingMore: true, loadMoreError: null });
        try {
          const page = await loadLatestHearContent(requestedPage);
          set((current) => {
            const stories = uniqueContent([...current.stories, ...page.items]);
            return {
              stories,
              topics: topicsFrom(stories),
              entities: entitiesFrom(stories),
              loadingMore: false,
              error: null,
              ...paginationState(page),
            };
          });
        } catch (error) {
          set({
            loadingMore: false,
            loadMoreError:
              error instanceof Error
                ? error.message
                : "More Hear! audio could not be loaded.",
          });
        }
      },

      refresh: async () => {
        const state = get();
        if (state.loading || state.loadingMore || state.refreshing) return;
        set({ refreshing: true, error: null, loadMoreError: null });
        try {
          const page = await loadLatestHearContent(0);
          const stories = uniqueContent(page.items);
          set({
            stories,
            topics: topicsFrom(stories),
            entities: entitiesFrom(stories),
            refreshing: false,
            initialLoadComplete: true,
            ...paginationState(page),
          });
        } catch (error) {
          set({
            refreshing: false,
            initialLoadComplete: true,
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

function paginationState(page: HearCataloguePage) {
  return {
    page: page.page,
    pageSize: page.limit,
    total: page.total,
    totalPages: page.totalPages,
    remaining: page.remaining,
    hasMore: page.remaining > 0 && page.page + 1 < page.totalPages,
  };
}

function uniqueContent(items: ContentItem[]): ContentItem[] {
  const unique = new Map<string, ContentItem>();
  for (const item of items) unique.set(item.id, item);
  return [...unique.values()];
}

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
