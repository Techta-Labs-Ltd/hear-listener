import { entities, stories, topics } from "@/data/catalogue";
import type { ContentItem, Entity } from "@/types";

export type CatalogueSearchResults = {
  shows: Entity[];
  audio: ContentItem[];
};

export function searchCatalogue(query: string): CatalogueSearchResults {
  const words = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 1);
  if (!words.length) return { shows: entities, audio: stories };

  const has = (value: string) =>
    words.some((word) => value.toLowerCase().includes(word));

  const shows = entities.filter(
    (entity) =>
      has(entity.name) ||
      has(entity.kind) ||
      (entity.description ? has(entity.description) : false),
  );
  const audio = stories.filter(
    (item) =>
      has(item.title) ||
      has(item.creator) ||
      has(item.publication) ||
      (item.topicIds ?? []).some((topicId) => {
        const topicName = topics.find((topic) => topic.id === topicId)?.name;
        return topicName ? has(topicName) : false;
      }),
  );
  return { shows, audio };
}

export function firstStoryForEntity(entity: Entity): ContentItem | undefined {
  return stories.find((item) => item.creator === entity.name);
}
