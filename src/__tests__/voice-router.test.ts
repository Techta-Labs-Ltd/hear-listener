import { LocalCommandRouter } from "@/services/voice/local-command-router";
import { voiceResolver } from "@/services/voice/local-voice-resolver";
import { ambiguityController } from "@/services/voice/ambiguity-controller";
import { feedbackVoiceController } from "@/services/voice/feedback-controller";
import { externalTranscriptPreparer } from "@/services/voice/external-transcript-preparer";
import { makeInvocation } from "@/utils/voice/matching/invocation";
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

  it.each([
    ["set playback speed to 1.25", 1.25],
    ["set playback speed to one point two five", 1.25],
    ["set play back speed to one and a half", 1.5],
    ["set playback speed to second speed", 0.75],
    ["set playback speed to normal speed", 1],
    ["tyndale talking magazine set playback speed to double", 2],
    ["play at half speed", 0.5],
  ])(
    "executes playback speed locally for %s",
    async (phrase, multiplier) => {
      const resolveSpy = jest.spyOn(voiceResolver, "resolve");
      const result = await router.route("s1", hypotheses(phrase));

      expect(result).toMatchObject({
        kind: "execute",
        invocation: { command: { type: "speed", multiplier } },
      });
      expect(resolveSpy).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["double speed", "up"],
    ["play it faster", "up"],
    ["half speed", "down"],
    ["play this slower", "down"],
  ] as const)(
    "matches Alexa-style speed step %s locally",
    async (phrase, direction) => {
      const resolveSpy = jest.spyOn(voiceResolver, "resolve");
      const result = await router.route("s1", hypotheses(phrase));

      expect(result).toMatchObject({
        kind: "execute",
        invocation: { command: { type: "speedStep", direction } },
      });
      expect(resolveSpy).not.toHaveBeenCalled();
    },
  );

  it.each([
    "set playback speed",
    "set playback speed to 1.4",
    "set playback speed to seventh speed",
  ])(
    "keeps unsupported playback-speed request %s local",
    async (phrase) => {
      const resolveSpy = jest.spyOn(voiceResolver, "resolve");
      const result = await router.route("s1", hypotheses(phrase));

      expect(result).toMatchObject({ kind: "feedback" });
      expect(resolveSpy).not.toHaveBeenCalled();
    },
  );

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

  it("prepares non-local content for the external resolver without local playback", async () => {
    const resolveSpy = jest
      .spyOn(voiceResolver, "resolve")
      .mockResolvedValue({ kind: "unrecognized", confidence: 0 });
    jest.spyOn(externalTranscriptPreparer, "prepare").mockResolvedValue({
      originalTranscript: "play tyndale talking magazine",
      preparedTranscript: "play Tyndale Talking Magazine",
      corrections: [],
    });
    const result = await router.route(
      "s1",
      hypotheses("play tyndale talking magazine"),
    );
    expect(resolveSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      kind: "remote",
      originalTranscript: "play tyndale talking magazine",
      preparedTranscript: "play Tyndale Talking Magazine",
    });
  });

  it.each([
    "play local news",
    "play the latest news",
    "play bible study",
    "play recommended audio",
    "play trending",
    "search for church news",
  ])("routes content discovery through the external Hear search for %s", async (phrase) => {
    jest.spyOn(externalTranscriptPreparer, "prepare").mockResolvedValue({
      originalTranscript: phrase,
      preparedTranscript: phrase,
      corrections: [],
    });

    await expect(router.route("s1", hypotheses(phrase))).resolves.toMatchObject({
      kind: "remote",
      originalTranscript: phrase,
      preparedTranscript: phrase,
    });
  });

  it("uses bare play only to resume an existing track", async () => {
    jest.spyOn(externalTranscriptPreparer, "prepare").mockResolvedValue({
      originalTranscript: "play",
      preparedTranscript: "play",
      corrections: [],
    });

    await expect(router.route("s1", hypotheses("play"))).resolves.toMatchObject({
      kind: "remote",
    });
    await expect(
      router.route("s1", hypotheses("play"), undefined, {
        playback: { current: { id: "remote-track" } },
      }),
    ).resolves.toMatchObject({
      kind: "execute",
      invocation: { executorKey: "resume" },
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
