import type {
  ContentItem,
  ExternalPlaybackTrack,
  PlaybackQueueMode,
} from "@/types";

const REMOTE_TRACK_COLORS = ["#5B3B82", "#1F6D75", "#8A4F35"] as const;

export function toRemoteContentItems(
  tracks: ExternalPlaybackTrack[],
): ContentItem[] {
  return tracks.map((track, index) => ({
    id: track.contentId,
    title: track.spokenTitle || track.title,
    creator:
      track.creator?.name ?? track.organization?.name ?? "Hear! contributor",
    creatorId: track.creator?.id,
    publication:
      track.publication?.title ?? track.organization?.name ?? "Hear!",
    publicationId: track.publication?.id,
    publicationTrackIndex: track.publicationTrackIndex,
    publicationTrackCount: track.publicationTrackCount,
    duration: formatDuration(track.durationSeconds),
    category: track.category?.name ?? "Audio",
    categoryId: track.category?.slug,
    color: REMOTE_TRACK_COLORS[index % REMOTE_TRACK_COLORS.length],
    description: track.shortDescription,
    topicIds: uniqueStrings([
      track.category?.slug,
      ...(track.tags ?? []),
    ]),
    audioUrl: track.audioUrl,
    audioDurationSeconds: track.durationSeconds,
    origin: "hear-search",
    organization: track.organization?.name,
    organizationId: track.organization?.id,
    tags: track.tags,
    publishedAt: track.publishedAt,
    playbackSpeedUrls: track.playbackSpeedUrls,
  }));
}

export function remotePlaybackAnnouncement(track: ExternalPlaybackTrack): string {
  const creator = track.creator?.name ?? track.organization?.name;
  return creator
    ? `Playing ${track.spokenTitle} by ${creator}.`
    : `Playing ${track.spokenTitle}.`;
}

export function remotePlaybackQueue(items: ContentItem[]): {
  items: ContentItem[];
  mode: PlaybackQueueMode;
} {
  const first = items[0];
  if (!first) return { items: [], mode: "single" };
  if (first.publicationTrackIndex === undefined) {
    return { items: [first], mode: "single" };
  }
  const publicationItems = items
    .filter(
      (item) =>
        item.publicationTrackIndex !== undefined &&
        (first.publicationId
          ? item.publicationId === first.publicationId
          : item.publication === first.publication),
    )
    .sort(
      (left, right) =>
        (left.publicationTrackIndex ?? 0) -
        (right.publicationTrackIndex ?? 0),
    );
  return {
    items: publicationItems.length > 0 ? publicationItems : [first],
    mode: "publication",
  };
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds < 1) return "Audio";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function uniqueStrings(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}
