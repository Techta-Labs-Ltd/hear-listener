import { useExternalVoiceStore } from "@/stores/external-voice-store";

describe("external voice Zustand store", () => {
  beforeEach(() => {
    useExternalVoiceStore.getState().resetExternalVoice();
  });

  it("supports label, ordinal, repeat and cancel for ambiguity", () => {
    const pending = useExternalVoiceStore.getState().receiveResponse(
      {
        kind: "ambiguity",
        interactionToken: "signed",
        prompt: "Which one did you mean?",
        choices: [
          { id: "creator:1", label: "Pendle Voice" },
          { id: "org:2", label: "Pendle Community" },
          { id: "creator:3", label: "Pendle Magazine" },
        ],
      },
      { voiceSessionId: "voice-1", installationId: "install-1" },
    );

    expect(pending?.choices).toHaveLength(3);
    expect(useExternalVoiceStore.getState().interpretPending("second")).toEqual({
      kind: "select",
      candidateId: "org:2",
    });
    expect(
      useExternalVoiceStore.getState().interpretPending("Pendle Voice"),
    ).toEqual({
      kind: "select",
      candidateId: "creator:1",
    });
    expect(
      useExternalVoiceStore.getState().interpretPending("community"),
    ).toEqual({
      kind: "select",
      candidateId: "org:2",
    });
    expect(
      useExternalVoiceStore.getState().interpretPending("repeat"),
    ).toMatchObject({ kind: "repeat" });
    expect(
      useExternalVoiceStore.getState().interpretPending("cancel"),
    ).toEqual({ kind: "cancel" });
  });

  it("accepts yes, clears after two invalid answers, and never reclassifies them", () => {
    useExternalVoiceStore.getState().receiveResponse(
      {
        kind: "confirmation",
        interactionToken: "signed",
        confirmationLabel: "Bible study",
        prompt: "Did you want me to play Bible study?",
      },
      { voiceSessionId: "voice-1", installationId: "install-1" },
    );

    expect(useExternalVoiceStore.getState().interpretPending("yes")).toEqual({
      kind: "confirm",
    });
    expect(
      useExternalVoiceStore
        .getState()
        .interpretPending("play something unrelated"),
    ).toEqual({
      kind: "invalid",
      prompt:
        "Did you want me to play Bible study? Please say yes or no.",
      choices: expect.any(Array),
    });
    expect(
      useExternalVoiceStore.getState().interpretPending("still unrelated"),
    ).toEqual({ kind: "cancel" });
    expect(useExternalVoiceStore.getState().getPending()).toBeUndefined();
  });

  it("owns request status and expires interactions after five minutes", () => {
    const now = 1_000;
    useExternalVoiceStore.getState().beginRequest();
    expect(useExternalVoiceStore.getState().status).toBe("resolving");

    const response = {
      kind: "confirmation" as const,
      interactionToken: "signed",
      confirmationLabel: "Bible study",
      prompt: "Did you want me to play Bible study?",
      expiresAt: new Date(now + 60 * 60_000).toISOString(),
    };
    const pending = useExternalVoiceStore.getState().receiveResponse(
      response,
      { voiceSessionId: "voice-1", installationId: "install-1" },
      now,
    );

    expect(useExternalVoiceStore.getState()).toMatchObject({
      status: "success",
      error: null,
      lastResponse: response,
    });
    expect(pending?.expiresAt).toBe(now + 5 * 60_000);
    expect(
      useExternalVoiceStore.getState().getPending(now + 5 * 60_000),
    ).toBeUndefined();
  });

  it("keeps transient workflow state out of persistence and resets atomically", () => {
    useExternalVoiceStore.getState().beginRequest();
    useExternalVoiceStore.getState().receiveResponse(
      {
        kind: "error",
        code: "offline",
        message: "Offline",
        retryable: true,
      },
      { voiceSessionId: "voice-1", installationId: "install-1" },
    );
    expect(useExternalVoiceStore.getState()).toMatchObject({
      status: "error",
      error: "Offline",
    });

    useExternalVoiceStore.getState().resetExternalVoice();
    expect(useExternalVoiceStore.getState()).toMatchObject({
      status: "idle",
      error: null,
      lastResponse: null,
      pending: undefined,
    });
  });
});
