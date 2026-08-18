import type { PlayCommandInput, PlayMode, VoiceServices } from "@/types";

export function runPlayCommand(
  command: PlayCommandInput,
  services: VoiceServices,
): string {
  if (command.mode === "current") {
    services.playback.play();
    return "Playing now";
  }

  const story = findStoryToPlay(command, services);

  if (!story) {
    return emptyMessageFor(command.mode);
  }

  services.playback.play(story);
  return successMessageFor(command, story.title);
}

function findStoryToPlay(command: PlayCommandInput, services: VoiceServices) {
  const stories = services.data.stories;

  switch (command.mode) {
    case "current":
      return undefined;
    case "latest": {
      const matchingStories = command.topicId
        ? stories.filter((story) => story.topicIds?.includes(command.topicId!))
        : stories;
      return matchingStories.at(-1) ?? stories.at(-1);
    }
    case "local":
      return (
        stories.find((story) =>
          story.publication.toLocaleLowerCase("en-GB").includes("local"),
        ) ?? stories.find((story) => story.topicIds?.includes("local"))
      );
    case "recommended":
      return stories.find((story) => story.category === "Recommended");
    case "trending":
      return stories.find((story) => story.category === "Trending");
    case "saved":
      return stories.find((story) =>
        services.preferences.savedIds.includes(story.id),
      );
    case "downloads":
      return stories.find(
        (story) =>
          services.preferences.downloadedIds.includes(story.id) ||
          story.downloaded,
      );
    case "story":
      return stories.find((story) => story.id === command.storyId);
  }
}

function emptyMessageFor(mode: PlayMode) {
  const messages: Partial<Record<PlayMode, string>> = {
    current: "Nothing is playing. Start a story first.",
    saved: "Nothing saved yet. Say save this while listening.",
    downloads: "Nothing downloaded yet. Say download this while listening.",
    story: "I could not find that story.",
  };

  return messages[mode] ?? "I could not find audio for that request.";
}

function successMessageFor(command: PlayCommandInput, title: string) {
  const messages: Partial<Record<PlayMode, string>> = {
    current: "Playing now",
    local: "Playing your local news",
    recommended: "Playing a recommendation",
    trending: "Playing what's trending",
    saved: "Playing your saved audio",
    downloads: "Playing your downloads",
    story: `Playing ${title}`,
  };

  if (command.mode !== "latest") {
    return messages[command.mode] ?? `Playing ${title}`;
  }

  if (command.locationId) {
    return `Playing the latest ${command.topicId ?? "audio"} for that area: ${title}`;
  }

  return `Playing the latest: ${title}`;
}
