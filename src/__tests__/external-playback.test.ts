import { toRemoteContentItems } from "@/utils/voice/external-playback";
import { migratePlayback, usePlaybackStore } from "@/stores/playback-store";
import type { ExternalPlaybackTrack } from "@/types";

const tracks: ExternalPlaybackTrack[] = [
  {
    contentId: "remote-1",
    audioUrl: "https://audio.hear.media/one.mp3",
    title: "First",
    spokenTitle: "First readable story",
    creator: { name: "Creator One" },
    durationSeconds: 125,
  },
  {
    contentId: "remote-2",
    audioUrl: "https://audio.hear.media/two.mp3",
    title: "Second",
    spokenTitle: "Second readable story",
    organization: { name: "Organisation Two" },
  },
];

describe("remote playback queue", () => {
  beforeEach(() => {
    usePlaybackStore.setState({
      current: undefined,
      playing: false,
      progress: 0,
      queue: [],
      seekToken: 0,
    });
  });

  it("plays the first result and uses the remaining remote queue for next", () => {
    const items = toRemoteContentItems(tracks);
    usePlaybackStore.getState().playQueue(items);

    expect(usePlaybackStore.getState()).toMatchObject({
      playing: true,
      current: { id: "remote-1", title: "First readable story" },
      queue: [{ id: "remote-1" }, { id: "remote-2" }],
    });
    usePlaybackStore.getState().next();
    expect(usePlaybackStore.getState().current?.id).toBe("remote-2");
    usePlaybackStore.getState().previous();
    expect(usePlaybackStore.getState().current?.id).toBe("remote-1");
  });

  it("restores valid HTTPS remote tracks and drops insecure ones", () => {
    const valid = toRemoteContentItems(tracks)[0];
    expect(
      migratePlayback({ current: valid, queue: [valid], progress: 0.4 }),
    ).toMatchObject({
      current: { id: "remote-1", origin: "hear-search" },
      queue: [{ id: "remote-1" }],
      progress: 0.4,
    });
    expect(
      migratePlayback({
        current: { ...valid, audioUrl: "http://insecure.example/one.mp3" },
        queue: [],
      }).current,
    ).toBeUndefined();
  });
});
