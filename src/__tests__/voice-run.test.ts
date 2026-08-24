import { runCommand } from "@/services/voice/executor";
import { entities, stories, topics } from "@/data/catalogue";
import {
  onboardingVoiceBridge,
  useOnboardingVoiceStore,
} from "@/stores/onboarding-voice-store";
import type { Preferences, VoiceServices } from "@/types";
import {
  librarySectionRoute,
  routes,
  settingsSectionRoute,
} from "@/navigation/routes";

function makeServices(overrides: Partial<VoiceServices> = {}): VoiceServices {
  return {
    navigate: {
      replace: jest.fn(),
      push: jest.fn(),
      back: jest.fn(),
      setDiscoverTopic: jest.fn(),
    },
    voiceData: {
      resetVoiceCorrections: jest.fn().mockResolvedValue(undefined),
    },
    playback: {
      current: undefined,
      play: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      next: jest.fn(),
      previous: jest.fn(),
      restart: jest.fn(),
      seekBy: jest.fn(),
      setSpeed: jest.fn(),
      stepSpeed: jest.fn(),
      setRepeat: jest.fn(),
      setSleepTimer: jest.fn(),
      cancelSleepTimer: jest.fn(),
      addToQueue: jest.fn(),
      clearQueue: jest.fn(),
    },
    preferences: {
      savedIds: [],
      downloadedIds: [],
      followingIds: [],
      update: jest.fn(),
    },
    readScreen: jest.fn(() => "Home. Shake device to speak."),
    data: { stories, topics, entities },
    ...overrides,
  };
}

describe("runCommand", () => {
  it("navigates to tabs and speaks feedback", () => {
    const s = makeServices();
    expect(runCommand({ type: "navigate", target: "home" }, s)).toBe(
      "Opening Home",
    );
    expect(s.navigate.replace).toHaveBeenCalledWith(routes.home);
    expect(runCommand({ type: "navigate", target: "discover" }, s)).toBe(
      "Opening Discover",
    );
    expect(s.navigate.replace).toHaveBeenCalledWith("/explore");
    expect(runCommand({ type: "navigate", target: "library" }, s)).toBe(
      "Opening Library",
    );
    expect(s.navigate.replace).toHaveBeenCalledWith("/library");
  });

  it("opens settings and library sections as pushed screens", () => {
    const s = makeServices();
    expect(runCommand({ type: "navigate", target: "settings" }, s)).toBe(
      "Opening Settings",
    );
    expect(s.navigate.push).toHaveBeenCalledWith("/settings");
    expect(
      runCommand({ type: "openLibrarySection", section: "saved" }, s),
    ).toBe("Opening saved");
    expect(s.navigate.push).toHaveBeenCalledWith(librarySectionRoute("saved"));
  });

  it("opens player only when something is playing", () => {
    const empty = makeServices();
    expect(runCommand({ type: "navigate", target: "player" }, empty)).toMatch(
      /Nothing is playing/,
    );
    expect(empty.navigate.push).not.toHaveBeenCalled();

    const playing = makeServices({
      playback: { ...makeServices().playback, current: stories[0] },
    });
    expect(runCommand({ type: "navigate", target: "player" }, playing)).toBe(
      "Opening the player",
    );
    expect(playing.navigate.push).toHaveBeenCalledWith("/player");
  });

  it("routes topics to discover with a topic param", () => {
    const s = makeServices();
    expect(runCommand({ type: "openTopic", topicId: "technology" }, s)).toBe(
      "Showing Technology stories",
    );
    expect(s.navigate.setDiscoverTopic).toHaveBeenCalledWith("technology");
  });

  it("plays by mode with correct story resolution", () => {
    const s = makeServices();
    expect(runCommand({ type: "play", mode: "current" }, s)).toBe(
      "Playing now",
    );
    expect(s.playback.play).toHaveBeenCalledWith();
    expect(runCommand({ type: "play", mode: "local" }, s)).toBe(
      "Playing your local news",
    );
    expect(s.playback.play).toHaveBeenCalledWith(
      expect.objectContaining({ id: "lagos" }),
    );
    expect(
      runCommand({ type: "play", mode: "story", storyId: "tech" }, s),
    ).toBe("Playing The human side of new technology");
    expect(runCommand({ type: "play", mode: "latest" }, s)).toBe(
      `Playing the latest: ${stories[stories.length - 1].title}`,
    );
  });

  it("explains empty saved and downloads", () => {
    const s = makeServices();
    expect(runCommand({ type: "play", mode: "saved" }, s)).toMatch(
      /Nothing saved yet/,
    );
    expect(s.playback.play).not.toHaveBeenCalled();
  });

  it("plays saved stories when they exist", () => {
    const s = makeServices({
      preferences: { ...makeServices().preferences, savedIds: ["arts"] },
    });
    expect(runCommand({ type: "play", mode: "saved" }, s)).toBe(
      "Playing your saved audio",
    );
    expect(s.playback.play).toHaveBeenCalledWith(
      expect.objectContaining({ id: "arts" }),
    );
  });

  it("controls playback transport", () => {
    const s = makeServices();
    expect(runCommand({ type: "pause" }, s)).toBe("Playback paused");
    expect(s.playback.pause).toHaveBeenCalled();
    expect(runCommand({ type: "resume" }, s)).toBe("Playing again");
    expect(runCommand({ type: "next" }, s)).toBe("Next story");
    expect(runCommand({ type: "previous" }, s)).toBe("Previous story");
    expect(runCommand({ type: "restart" }, s)).toBe("Starting over");
    expect(
      runCommand({ type: "seek", direction: "backward", seconds: 15 }, s),
    ).toBe("Rewound 15 seconds");
    expect(s.playback.seekBy).toHaveBeenCalledWith(-15);
    expect(
      runCommand({ type: "seek", direction: "forward", seconds: 30 }, s),
    ).toBe("Fast-forwarded 30 seconds");
    expect(s.playback.seekBy).toHaveBeenCalledWith(30);
  });

  it("sets speed, repeat and sleep timer", () => {
    const s = makeServices();
    expect(runCommand({ type: "speed", multiplier: 1.5 }, s)).toBe(
      "Speed set to 1.5 times",
    );
    expect(s.playback.setSpeed).toHaveBeenCalledWith(1.5);
    expect(runCommand({ type: "speedStep", direction: "up" }, s)).toBe(
      "Speeding up",
    );
    expect(runCommand({ type: "repeat", mode: "on" }, s)).toBe("Repeat on");
    expect(s.playback.setRepeat).toHaveBeenCalledWith("on");
    expect(runCommand({ type: "sleepTimer", minutes: 20 }, s)).toBe(
      "Sleep timer set for 20 minutes",
    );
    expect(s.playback.setSleepTimer).toHaveBeenCalledWith(20);
    expect(runCommand({ type: "cancelSleepTimer" }, s)).toBe(
      "Sleep timer cancelled",
    );
  });

  it("saves and removes the current story", () => {
    const s = makeServices({
      playback: { ...makeServices().playback, current: stories[0] },
    });
    expect(runCommand({ type: "saveCurrent" }, s)).toBe(
      "Saved to your library",
    );
    expect(s.preferences.update).toHaveBeenCalledWith({ savedIds: ["daily"] });
    expect(runCommand({ type: "removeSaved" }, s)).toBe("Removed from saved");
  });

  it("refuses to save when nothing is playing", () => {
    const s = makeServices();
    expect(runCommand({ type: "saveCurrent" }, s)).toMatch(
      /Nothing is playing/,
    );
    expect(s.preferences.update).not.toHaveBeenCalled();
  });

  it("downloads and removes downloads", () => {
    const s = makeServices({
      playback: { ...makeServices().playback, current: stories[0] },
    });
    expect(runCommand({ type: "downloadCurrent" }, s)).toBe(
      "Download started",
    );
    expect(s.preferences.update).toHaveBeenCalledWith({
      downloadedIds: ["daily"],
    });
    expect(runCommand({ type: "removeDownload" }, s)).toBe("Download removed");
  });

  it("follows and unfollows entities", () => {
    const s = makeServices();
    expect(runCommand({ type: "follow", entityId: "hear-daily" }, s)).toBe(
      "Now following Hear Daily",
    );
    expect(s.preferences.update).toHaveBeenCalledWith({
      followingIds: ["hear-daily"],
    });
    expect(runCommand({ type: "unfollow", entityId: "hear-daily" }, s)).toBe(
      "Unfollowed Hear Daily",
    );
  });

  it("answers what-is-this and who-made-this", () => {
    const s = makeServices({
      playback: { ...makeServices().playback, current: stories[0] },
    });
    expect(runCommand({ type: "whatIsThis" }, s)).toBe(stories[0].description);
    expect(runCommand({ type: "whoMadeThis" }, s)).toBe(
      `Made by ${stories[0].creator}, published by ${stories[0].publication}.`,
    );
  });

  it("queues the current story", () => {
    const s = makeServices({
      playback: { ...makeServices().playback, current: stories[0] },
    });
    expect(runCommand({ type: "addToQueue" }, s)).toBe("Added to your queue");
    expect(s.playback.addToQueue).toHaveBeenCalled();
    expect(runCommand({ type: "clearQueue" }, s)).toBe("Queue cleared");
  });

  it("closes without spoken feedback", () => {
    const s = makeServices();
    expect(runCommand({ type: "close" }, s)).toBeNull();
    expect(s.navigate.back).toHaveBeenCalled();
  });

  it("handles preferences through the update channel", () => {
    const update = jest.fn();
    const s = makeServices({
      preferences: {
        savedIds: [],
        downloadedIds: [],
        followingIds: [],
        update,
      },
      playback: { ...makeServices().playback, current: stories[0] },
    });
    runCommand({ type: "saveCurrent" }, s);
    expect(update).toHaveBeenCalledWith<[Partial<Preferences>]>({
      savedIds: ["daily"],
    });
  });

  it("stores a resolved local area", () => {
    const s = makeServices();
    expect(
      runCommand(
        { type: "setLocation", locationId: "GBEDH", name: "Edinburgh" },
        s,
      ),
    ).toBe("Local area set to Edinburgh");
    expect(s.preferences.update).toHaveBeenCalledWith({ town: "Edinburgh" });
  });

  it.each([
    ["openBluetoothSettings", settingsSectionRoute("connections", "bluetooth")],
    ["openWifiSettings", settingsSectionRoute("connections", "wifi")],
    ["openInternetSettings", settingsSectionRoute("connections", "internet")],
    ["openAudioSettings", settingsSectionRoute("connections", "audio")],
    [
      "openAccessibilitySettings",
      settingsSectionRoute("experience", "accessibility"),
    ],
    ["openLocationSettings", settingsSectionRoute("experience", "location")],
    ["openAppSettings", settingsSectionRoute("experience", "privacy")],
  ] as const)(
    "routes %s to the matching Hear settings section",
    (type, href) => {
      const s = makeServices();
      runCommand({ type }, s);
      expect(s.navigate.push).toHaveBeenCalledWith(href);
    },
  );

  it("resets locally learned voice corrections", () => {
    const s = makeServices();
    runCommand({ type: "resetVoiceCorrections" }, s);
    expect(s.voiceData.resetVoiceCorrections).toHaveBeenCalled();
  });

  it("reads the screen through the screen readout service", () => {
    const s = makeServices();
    expect(runCommand({ type: "readScreen" }, s)).toBe(
      "Home. Shake device to speak.",
    );
    expect(s.readScreen).toHaveBeenCalled();
  });

  it("dispatches onboarding voice commands to the bridge", () => {
    const s = makeServices();
    onboardingVoiceBridge.registerStep({
      stepIndex: 2,
      totalSteps: 6,
      title: "Check the sound from this phone.",
      description: "Play a short spoken sample.",
      options: ["Say play sound check"],
    });
    expect(runCommand({ type: "onboardingContinue" }, s)).toBe(
      "Continuing setup.",
    );
    expect(runCommand({ type: "onboardingBack" }, s)).toBe(
      "Going back a step.",
    );
    expect(runCommand({ type: "onboardingSkip" }, s)).toBe(
      "Skipping this step.",
    );
    expect(
      runCommand(
        { type: "onboardingSetTown", locationId: "GBEDH", name: "Edinburgh" },
        s,
      ),
    ).toBe("Town set to Edinburgh");
    expect(useOnboardingVoiceStore.getState().lastCommand?.type).toBe(
      "setTown",
    );
  });

  it("reads the onboarding step instructions aloud", () => {
    const s = makeServices();
    onboardingVoiceBridge.registerStep({
      stepIndex: 0,
      totalSteps: 6,
      title: "Let's get Hear! ready for you.",
      description: "Setup takes about two minutes.",
      options: ["Shake device to begin"],
    });
    expect(runCommand({ type: "onboardingRead" }, s)).toBe(
      "Step 1 of 6. Let's get Hear! ready for you. Setup takes about two minutes.",
    );
  });
});
