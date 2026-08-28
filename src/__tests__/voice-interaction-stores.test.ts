import { useAmbiguityStore } from "@/stores/ambiguity-store";
import { useFeedbackVoiceStore } from "@/stores/feedback-voice-store";

describe("voice interaction Zustand stores", () => {
  beforeEach(() => {
    useAmbiguityStore.getState().clearAmbiguity();
    useFeedbackVoiceStore.getState().clearFeedback();
  });

  it("keeps ambiguity selection observable and immutable", () => {
    const now = Date.now();
    const initial = useAmbiguityStore.getState().setAmbiguity(
      "session-1",
      "request-1",
      [
        { id: "one", label: "First option" },
        { id: "two", label: "Second option" },
      ],
      undefined,
      now,
    );

    const next = useAmbiguityStore.getState().moveSelection(1);
    expect(next).not.toBe(initial);
    expect(next?.selectedIndex).toBe(1);
    expect(
      useAmbiguityStore.getState().selectByTranscript("first"),
    ).toMatchObject({ id: "one", label: "First option" });
    expect(useAmbiguityStore.getState().pending?.selectedIndex).toBe(0);
  });

  it("expires ambiguity state without persisting stale choices", () => {
    useAmbiguityStore.getState().setAmbiguity(
      "session-1",
      "request-1",
      [{ id: "one", label: "First option" }],
      undefined,
      1_000,
    );

    expect(useAmbiguityStore.getState().getPending(31_001)).toBeUndefined();
    expect(useAmbiguityStore.getState().pending).toBeUndefined();
  });

  it("owns feedback target and rating as one resettable state", () => {
    useFeedbackVoiceStore.getState().startFeedback({
      kind: "track",
      trackId: "track-1",
      playbackSessionId: "playback-1",
    });
    useFeedbackVoiceStore.getState().setRating(5);

    expect(useFeedbackVoiceStore.getState()).toMatchObject({
      activeTarget: { kind: "track", trackId: "track-1" },
      pendingRating: 5,
    });
    useFeedbackVoiceStore.getState().clearFeedback();
    expect(useFeedbackVoiceStore.getState()).toMatchObject({
      activeTarget: undefined,
      pendingRating: undefined,
    });
  });
});
