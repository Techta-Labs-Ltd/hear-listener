import { entities, stories } from "@/data/catalogue";
import type { CatalogueSearchResults, ContentItem, Entity } from "@/types";

export function searchCatalogue(rawQuery: string): CatalogueSearchResults {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return {
      audio: stories.slice(0, 4),
      shows: entities.slice(0, 2),
    };
  }

  const terms = query.split(/\s+/);
  const audio = stories.filter((story) => {
    const title = story.title.toLowerCase();
    const creator = story.creator.toLowerCase();
    const publication = story.publication.toLowerCase();
    const desc = story.description?.toLowerCase() ?? "";
    return terms.some(
      (term) =>
        title.includes(term) ||
        creator.includes(term) ||
        publication.includes(term) ||
        desc.includes(term),
    );
  });

  const shows = entities.filter((entity) => {
    const name = entity.name.toLowerCase();
    const desc = entity.description?.toLowerCase() ?? "";
    return terms.some((term) => name.includes(term) || desc.includes(term));
  });

  return { audio, shows };
}

export function firstStoryForEntity(entity: Entity): ContentItem | undefined {
  return (
    stories.find((s) => s.creator.toLowerCase() === entity.name.toLowerCase()) ??
    stories.find((s) => s.publication.toLowerCase() === entity.name.toLowerCase()) ??
    stories[0]
  );
}
