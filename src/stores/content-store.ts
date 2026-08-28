import { create } from "zustand";
import { searchHearCatalogue } from "@/services/content/hear-catalogue-service";
import type { ContentItem, ContentState, Entity, Topic } from "@/types";

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

export const useContentStore = create<ContentState>((set, get) => ({
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

  getStoryById: (id) => get().stories.find((item) => item.id === id),

  getStoriesByTopic: (topicId) =>
    get().stories.filter((item) => item.topicIds?.includes(topicId)),

  getStoriesByEntity: (entityName) =>
    get().stories.filter(
      (item) =>
        item.creator === entityName || item.organization === entityName,
    ),
}));

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
