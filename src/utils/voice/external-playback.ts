import type { ContentItem, ExternalPlaybackTrack } from "@/types";

const REMOTE_TRACK_COLORS = ["#5B3B82", "#1F6D75", "#8A4F35"] as const;

export function toRemoteContentItems(
  tracks: ExternalPlaybackTrack[],
): ContentItem[] {
  return tracks.map((track, index) => ({
    id: track.contentId,
    title: track.spokenTitle || track.title,
    creator:
      track.creator?.name ?? track.organization?.name ?? "Hear! contributor",
    publication:
      track.publication?.title ?? track.organization?.name ?? "Hear!",
    duration: formatDuration(track.durationSeconds),
    category: track.category?.name ?? "Audio",
    color: REMOTE_TRACK_COLORS[index % REMOTE_TRACK_COLORS.length],
    description: track.shortDescription,
    audioUrl: track.audioUrl,
    audioDurationSeconds: track.durationSeconds,
    origin: "hear-search",
    organization: track.organization?.name,
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

function formatDuration(seconds?: number): string {
  if (!seconds || seconds < 1) return "";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
