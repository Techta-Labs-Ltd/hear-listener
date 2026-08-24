import { entities, stories } from "@/data/catalogue";
import type { ContentItem, Entity } from "@/types";

export interface CreatorRelease {
  creator: Entity;
  story: ContentItem;
}

export function findReleasesForFollowedCreators(
  followingIds: string[],
  alreadyNotifiedIds: string[] = [],
): CreatorRelease[] {
  if (followingIds.length === 0) return [];

  const alreadyNotified = new Set(alreadyNotifiedIds);
  const followedCreators = entities.filter((creator) =>
    followingIds.includes(creator.id),
  );

  return followedCreators.flatMap((creator) => {
    const creatorName = creator.name.toLowerCase().trim();

    return stories
      .filter((story) => {
        const matchesCreator =
          story.creator.toLowerCase().trim() === creatorName ||
          story.id.startsWith(creator.id);
        const matchesPublication =
          story.publication.toLowerCase().trim() === creatorName;

        return (
          (matchesCreator || matchesPublication) &&
          !alreadyNotified.has(story.id)
        );
      })
      .map((story) => ({ creator, story }));
  });
}
