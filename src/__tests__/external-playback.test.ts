import {
  remotePlaybackQueue,
  toRemoteContentItems,
} from "@/utils/voice/external-playback";
import {
  playbackInterruptionPrompt,
  shouldResumeAfterPlaybackCommand,
} from "@/utils/voice/playback-interruption";
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
      queueMode: "single",
      playbackSessionId: "",
      completion: undefined,
      completionSequence: 0,
      seekToken: 0,
    });
  });

  it("plays only the first ordinary search result and stops when it finishes", () => {
    const items = toRemoteContentItems(tracks);
    const queue = remotePlaybackQueue(items);
    usePlaybackStore.getState().playQueue(queue.items, { mode: queue.mode });

    expect(usePlaybackStore.getState()).toMatchObject({
      playing: true,
      current: { id: "remote-1", title: "First readable story" },
      queueMode: "single",
      queue: [{ id: "remote-1" }],
    });
    usePlaybackStore.getState().handleTrackFinished();
    expect(usePlaybackStore.getState()).toMatchObject({
      playing: false,
      progress: 1,
      current: { id: "remote-1" },
      completion: undefined,
    });
  });

  it("advances only within an explicit publication and announces its end", () => {
    const items = toRemoteContentItems([
      {
        ...tracks[0],
        publication: { id: "publication-1", title: "Community Monthly" },
        publicationTrackIndex: 0,
        publicationTrackCount: 2,
      },
      {
        ...tracks[1],
        publication: { id: "publication-1", title: "Community Monthly" },
        publicationTrackIndex: 1,
        publicationTrackCount: 2,
      },
    ]);
    const queue = remotePlaybackQueue(items);
    usePlaybackStore.getState().playQueue(queue.items, { mode: queue.mode });

    expect(usePlaybackStore.getState()).toMatchObject({
      queueMode: "publication",
      queue: [{ id: "remote-1" }, { id: "remote-2" }],
    });
    usePlaybackStore.getState().handleTrackFinished();
    expect(usePlaybackStore.getState()).toMatchObject({
      playing: true,
      current: { id: "remote-2" },
    });
    usePlaybackStore.getState().handleTrackFinished();
    expect(usePlaybackStore.getState()).toMatchObject({
      playing: false,
      completion: {
        kind: "publication",
        publicationId: "publication-1",
        publicationTitle: "Community Monthly",
        listenedTrackIds: ["remote-1", "remote-2"],
      },
    });
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

  it("drops persisted bundled demo content during playback migration", () => {
    expect(
      migratePlayback({
        current: {
          id: "local-voices",
          title: "How the city is changing after dark",
          creator: "Street Stories",
          audioUrl: 37,
        },
        queue: [],
      }),
    ).toMatchObject({ current: undefined, queue: [] });
  });

  it("refuses to make catalogue placeholders the active playback source", () => {
    usePlaybackStore.getState().play({
      id: "demo",
      title: "Demo",
      creator: "Demo creator",
      publication: "Demo publication",
      duration: "1:00",
      category: "Demo",
      color: "#000000",
      audioUrl: 37,
      origin: "catalogue",
    });
    expect(usePlaybackStore.getState()).toMatchObject({
      current: undefined,
      playing: false,
    });
  });

  it("builds a shake prompt for interrupted audio and completed publications", () => {
    const current = toRemoteContentItems(tracks)[0];
    expect(
      playbackInterruptionPrompt({
        current,
        playing: true,
        progress: 0.25,
        queueMode: "single",
      }),
    ).toBe(
      "You were listening to First readable story. Say continue listening, give feedback, or tell me what you want to hear instead.",
    );
    expect(
      playbackInterruptionPrompt({
        current: { ...current, publication: "Community Monthly" },
        playing: false,
        progress: 1,
        queueMode: "publication",
      }),
    ).toBe(
      "You finished Community Monthly. Say give feedback, or tell me what you want to hear next.",
    );
  });

  it("keeps content paused until speech completes for playback commands", () => {
    expect(shouldResumeAfterPlaybackCommand("resume", false)).toBe(true);
    expect(shouldResumeAfterPlaybackCommand("next", false)).toBe(true);
    expect(shouldResumeAfterPlaybackCommand("speed", true)).toBe(true);
    expect(shouldResumeAfterPlaybackCommand("speed", false)).toBe(false);
    expect(shouldResumeAfterPlaybackCommand("pause", true)).toBe(false);
  });
});
