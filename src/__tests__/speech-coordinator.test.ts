import {
  speechCoordinator,
  voiceAudioGate,
} from "@/services/voice/speech-coordinator";
import { ukSpeech } from "@/services/voice/speech";

jest.mock("@/services/voice/speech", () => ({
  ukSpeech: {
    speak: jest.fn().mockResolvedValue("DONE"),
    stop: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("speech coordinator playback gate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    speechCoordinator.setScreenReaderEnabled(false);
    speechCoordinator.exitQuietMode();
    speechCoordinator.setContentPlaybackActive(false);
  });

  afterEach(() => {
    speechCoordinator.exitQuietMode();
    speechCoordinator.setContentPlaybackActive(false);
  });

  it("stops pending speech and suppresses narration while content is playing", async () => {
    speechCoordinator.setContentPlaybackActive(true);

    await speechCoordinator.announce({
      key: "screen:player",
      text: "Shake device to speak.",
      priority: "screen",
    });

    expect(ukSpeech.stop).toHaveBeenCalledTimes(1);
    expect(ukSpeech.speak).not.toHaveBeenCalled();
    expect(speechCoordinator.isQuiet()).toBe(true);
    expect(voiceAudioGate.isQuiet()).toBe(true);
  });

  it("allows speech again after playback pauses", async () => {
    speechCoordinator.setContentPlaybackActive(true);
    speechCoordinator.setContentPlaybackActive(false);

    await speechCoordinator.announce({
      key: "screen:paused-player",
      text: "Playback is paused.",
      priority: "screen",
    });

    expect(ukSpeech.speak).toHaveBeenCalledWith("Playback is paused.", {
      interrupt: false,
    });
    expect(speechCoordinator.isQuiet()).toBe(false);
  });

  it("does not release a separate voice-capture gate when playback pauses", () => {
    speechCoordinator.enterQuietMode();
    speechCoordinator.setContentPlaybackActive(true);
    speechCoordinator.setContentPlaybackActive(false);

    expect(speechCoordinator.isQuiet()).toBe(true);
    expect(voiceAudioGate.isQuiet()).toBe(true);

    speechCoordinator.exitQuietMode();
    expect(speechCoordinator.isQuiet()).toBe(false);
  });
});
