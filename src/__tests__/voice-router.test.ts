import { LocalCommandRouter } from "@/services/voice/local-command-router";
import { voiceResolver } from "@/services/voice/resolver";
import { ambiguityController } from "@/services/voice/ambiguity-controller";
import { feedbackVoiceController } from "@/services/voice/feedback-controller";
import { makeInvocation } from "@/services/voice/matching/invocation";
import type { VoiceHypothesis } from "@/types";

jest.mock("@/services/voice/speech-coordinator", () => ({
  speechCoordinator: {},
  voiceAnnounce: jest.fn().mockResolvedValue(undefined),
}));

const router = new LocalCommandRouter();
const hypotheses = (transcript: string): VoiceHypothesis[] => [
  { transcript, confidence: 0.9, rank: 0 },
];

describe("LocalCommandRouter", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    ambiguityController.clear();
    feedbackVoiceController.clear();
  });

  it.each([
    ["pause", "pause"],
    ["resume", "resume"],
    ["next", "next"],
    ["previous", "previous"],
    ["open settings", "navigate"],
    ["open library", "navigate"],
    ["open discover", "navigate"],
    ["read this screen", "readScreen"],
    ["help", "help"],
    ["open wifi settings", "openWifiSettings"],
    ["open bluetooth settings", "openBluetoothSettings"],
    ["clear queue", "clearQueue"],
    ["save this", "saveCurrent"],
  ])(
    "executes deterministic local command %s without touching the resolver",
    async (phrase, executorKey) => {
      const resolveSpy = jest
        .spyOn(voiceResolver, "resolve")
        .mockResolvedValue({ kind: "unrecognized", confidence: 0 });
      const result = await router.route("s1", hypotheses(phrase));
      expect(result).toMatchObject({
        kind: "execute",
        invocation: { executorKey },
      });
      expect(resolveSpy).not.toHaveBeenCalled();
    },
  );

  it("parses sleep timer and seek numbers", async () => {
    const resolveSpy = jest.spyOn(voiceResolver, "resolve");
    const sleep = await router.route(
      "s1",
      hypotheses("set a sleep timer for 20 minutes"),
    );
    expect(sleep).toMatchObject({
      kind: "execute",
      invocation: { command: { type: "sleepTimer", minutes: 20 } },
    });
    const seek = await router.route("s1", hypotheses("rewind 15 seconds"));
    expect(seek).toMatchObject({
      kind: "execute",
      invocation: { command: { type: "seek", seconds: 15, direction: "backward" } },
    });
    expect(resolveSpy).not.toHaveBeenCalled();
  });

  it("maps stop to pause while playing and close otherwise", async () => {
    const playing = await router.route("s1", hypotheses("stop"), undefined, {
      playback: { playing: true },
    });
    expect(playing).toMatchObject({
      kind: "execute",
      invocation: { command: { type: "pause" } },
    });
    const idle = await router.route("s1", hypotheses("stop"), undefined, {
      playback: { playing: false },
    });
    expect(idle).toMatchObject({
      kind: "execute",
      invocation: { command: { type: "cancel" } },
    });
  });

  it("passes content requests to the semantic resolver and returns remote on unresolved", async () => {
    const resolveSpy = jest
      .spyOn(voiceResolver, "resolve")
      .mockResolvedValue({ kind: "unrecognized", confidence: 0 });
    const result = await router.route(
      "s1",
      hypotheses("play tyndale talking magazine"),
    );
    expect(resolveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        hypotheses: hypotheses("play tyndale talking magazine"),
      }),
    );
    expect(result).toMatchObject({
      kind: "remote",
      transcript: "play tyndale talking magazine",
    });
  });

  it("lets pending ambiguity own left, right and select follow-ups", async () => {
    const resolveSpy = jest.spyOn(voiceResolver, "resolve");
    const choiceInvocation = makeInvocation({
      sessionId: "s1",
      actionId: "play:story",
      executorKey: "play",
      command: { type: "play", mode: "story", storyId: "story-1" },
    });
    ambiguityController.setAmbiguity(
      "s1",
      "req-1",
      [
        {
          id: "c1",
          label: "Option One",
          command: choiceInvocation.command,
          invocation: choiceInvocation,
        },
      ],
      [choiceInvocation],
    );

    const right = await router.route("s1", hypotheses("right"));
    expect(right).toMatchObject({ kind: "selected" });

    const select = await router.route("s1", hypotheses("select"));
    expect(select).toMatchObject({
      kind: "execute",
      invocation: { command: { type: "play", mode: "story" } },
    });
    expect(resolveSpy).not.toHaveBeenCalled();
  });

  it("opens a feedback interaction for playback context and handles ratings", async () => {
    const entry = await router.route("s1", hypotheses("give feedback"), undefined, {
      playback: { current: { id: "daily", title: "Daily" }, playing: true },
    });
    expect(entry).toMatchObject({ kind: "feedback" });
    expect(feedbackVoiceController.getTarget()).toBeDefined();

    const rating = await router.route("s1", hypotheses("good"));
    expect(rating).toMatchObject({ kind: "selected" });
    expect(feedbackVoiceController.getRating()).toBe(4);

    const send = await router.route("s1", hypotheses("send"));
    expect(send).toMatchObject({ kind: "selected" });
    expect(feedbackVoiceController.getTarget()).toBeUndefined();
  });
});
