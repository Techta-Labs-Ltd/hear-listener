import { act, render } from "@testing-library/react-native";
import { AudioRuntime } from "@/lib/audio/AudioRuntime";
import { usePlaybackStore, useSpeechStore } from "@/stores";
import { speechCoordinator } from "@/services/voice/speech-coordinator";
import { ukSpeech } from "@/services/voice/speech";
import type { ContentItem } from "@/types";

const mockPlayer = {
  paused: true,
  playing: false,
  loop: false,
  pause: jest.fn(),
  play: jest.fn(),
  replace: jest.fn(),
  seekTo: jest.fn(),
  setActiveForLockScreen: jest.fn(),
  setPlaybackRate: jest.fn(),
};

jest.mock("expo-audio", () => ({
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  useAudioPlayer: jest.fn(() => mockPlayer),
  useAudioPlayerStatus: jest.fn(() => ({
    isLoaded: false,
    playing: false,
    currentTime: 0,
    duration: 0,
    didJustFinish: false,
  })),
}));

jest.mock("@/services/voice/speech", () => ({
  ukSpeech: {
    speak: jest.fn().mockResolvedValue("DONE"),
    stop: jest.fn().mockResolvedValue(undefined),
  },
}));

const playableTrack: ContentItem = {
  id: "remote-track",
  title: "A live Hear! track",
  creator: "Hear! contributor",
  publication: "Hear!",
  duration: "10:00",
  category: "Audio",
  color: "#5B3B82",
  audioUrl: "https://audio.hear.media/track.mp3",
  origin: "hear-search",
};

describe("AudioRuntime playback speech coordination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    speechCoordinator.exitQuietMode();
    speechCoordinator.setContentPlaybackActive(false);
    useSpeechStore.getState().resetSpeech();
    usePlaybackStore.setState({
      current: undefined,
      playing: false,
      progress: 0,
      queue: [],
      queueMode: "single",
    });
  });

  afterEach(() => {
    speechCoordinator.exitQuietMode();
    speechCoordinator.setContentPlaybackActive(false);
  });

  it("blocks reminders synchronously when playback starts and releases them on pause", async () => {
    const runtime = await render(<AudioRuntime />);

    await act(() => usePlaybackStore.getState().play(playableTrack));

    expect(speechCoordinator.isQuiet()).toBe(true);
    expect(ukSpeech.stop).toHaveBeenCalled();

    await act(() => usePlaybackStore.getState().pause());

    expect(speechCoordinator.isQuiet()).toBe(false);
    await runtime.unmount();
  });
});
