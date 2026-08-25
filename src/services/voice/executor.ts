import type {
  ContentItem,
  PlayCommandInput,
  PlayMode,
  VoiceCommand,
  VoiceExecutionResult,
  VoiceExecutor,
  VoiceExecutorKey,
  VoiceInvocation,
  VoiceServices,
} from "@/types";
import {
  librarySectionRoute,
  routes,
  settingsSectionRoute,
} from "@/navigation/routes";
import { onboardingVoiceBridge } from "@/stores/onboarding-voice-store";
import { accountVoiceBridge } from "@/stores/account-command-store";
import { searchCatalogue } from "@/utils/search";

export function runPlayCommand(
  command: PlayCommandInput,
  services: VoiceServices,
): string {
  if (command.mode === "current") {
    services.playback.play();
    return "Playing now";
  }

  const story = findStoryToPlay(command, services);

  if (!story) {
    return emptyMessageFor(command.mode);
  }

  services.playback.play(story);
  return successMessageFor(command, story.title);
}

function findStoryToPlay(command: PlayCommandInput, services: VoiceServices) {
  const stories = services.data.stories;

  switch (command.mode) {
    case "current":
      return undefined;
    case "latest": {
      const scoped = command.entityName
        ? stories.filter((story) => matchesEntity(story, command.entityName))
        : stories;
      const matchingStories = command.topicId
        ? scoped.filter((story) => story.topicIds?.includes(command.topicId!))
        : scoped;
      return matchingStories.at(-1) ?? scoped.at(-1) ?? stories.at(-1);
    }
    case "local":
      return (
        stories.find((story) =>
          story.publication.toLocaleLowerCase("en-GB").includes("local"),
        ) ?? stories.find((story) => story.topicIds?.includes("local"))
      );
    case "recommended":
      return stories.find((story) => story.category === "Recommended");
    case "trending":
      return stories.find((story) => story.category === "Trending");
    case "saved":
      return stories.find((story) =>
        services.preferences.savedIds.includes(story.id),
      );
    case "downloads":
      return stories.find(
        (story) =>
          services.preferences.downloadedIds.includes(story.id) ||
          story.downloaded,
      );
    case "story":
      return stories.find((story) => story.id === command.storyId);
    case "entity":
      return command.entityName
        ? stories.find((story) => matchesEntity(story, command.entityName))
        : undefined;
  }
}

function matchesEntity(story: ContentItem, entityName: string | undefined) {
  if (!entityName) return false;
  const name = entityName.toLowerCase();
  return (
    story.creator.toLowerCase() === name ||
    story.publication.toLowerCase() === name
  );
}

function emptyMessageFor(mode: PlayMode) {
  const messages: Partial<Record<PlayMode, string>> = {
    current: "Nothing is playing. Start a story first.",
    saved: "Nothing saved yet. Say save this while listening.",
    downloads: "Nothing downloaded yet. Say download this while listening.",
    story: "I could not find that story.",
  };

  return messages[mode] ?? "I could not find audio for that request.";
}

function successMessageFor(command: PlayCommandInput, title: string) {
  const messages: Partial<Record<PlayMode, string>> = {
    current: "Playing now",
    local: "Playing your local news",
    recommended: "Playing a recommendation",
    trending: "Playing what's trending",
    saved: "Playing your saved audio",
    downloads: "Playing your downloads",
    story: `Playing ${title}`,
    entity: `Playing ${title}`,
  };

  if (command.mode !== "latest") {
    return messages[command.mode] ?? `Playing ${title}`;
  }

  if (command.locationId) {
    return `Playing the latest ${command.topicId ?? "audio"} for that area: ${title}`;
  }

  return `Playing the latest: ${title}`;
}

export function runCommand(
  command: VoiceCommand,
  s: VoiceServices,
): string | null {
  switch (command.type) {
    case "navigate":
      return navigate(command.target, s);
    case "close":
      s.navigate.back();
      return null;
    case "cancel":
      return "";
    case "openLibrarySection": {
      s.navigate.push(librarySectionRoute(command.section));
      return `Opening ${command.section}`;
    }
    case "openTopic": {
      s.navigate.setDiscoverTopic(command.topicId);
      const topic = s.data.topics.find((item) => item.id === command.topicId);
      return topic ? `Showing ${topic.name} stories` : "Opening that topic";
    }
    case "setLocation":
      s.preferences.update({ town: command.name });
      return `Local area set to ${command.name}`;
    case "search": {
      const results = searchCatalogue(command.query);
      const story = results.audio[0];
      if (story) {
        s.playback.play(story);
        return `Playing ${story.title}`;
      }
      const entity = results.shows[0];
      if (entity) {
        const match = s.data.stories.find(
          (item) =>
            item.creator.toLowerCase() === entity.name.toLowerCase() ||
            item.publication.toLowerCase() === entity.name.toLowerCase(),
        );
        if (match) {
          s.playback.play(match);
          return `Playing from ${entity.name}`;
        }
      }
      return `I couldn't find anything for ${command.query}. Try a topic name or say play local news.`;
    }
    case "play":
      return runPlayCommand(command, s);
    case "pause":
      s.playback.pause();
      return "Playback paused";
    case "resume":
      s.playback.resume();
      return "Playing again";
    case "next":
      s.playback.next();
      return "Next story";
    case "previous":
      s.playback.previous();
      return "Previous story";
    case "restart":
      s.playback.restart();
      return "Starting over";
    case "repeat":
      s.playback.setRepeat(command.mode);
      return command.mode === "on" ? "Repeat on" : "Repeat off";
    case "seek":
      s.playback.seekBy(
        command.direction === "forward" ? command.seconds : -command.seconds,
      );
      return command.direction === "forward"
        ? `Fast-forwarded ${command.seconds} seconds`
        : `Rewound ${command.seconds} seconds`;
    case "speed":
      s.playback.setSpeed(command.multiplier);
      return `Speed set to ${command.multiplier} times`;
    case "speedStep":
      s.playback.stepSpeed(command.direction);
      return command.direction === "up" ? "Speeding up" : "Slowing down";
    case "saveCurrent": {
      const current = s.playback.current;
      if (!current) return "Nothing is playing. Start a story first.";
      if (s.preferences.savedIds.includes(current.id))
        return "Already in your saved audio.";
      s.preferences.update({
        savedIds: [...s.preferences.savedIds, current.id],
      });
      return "Saved to your library";
    }
    case "removeSaved": {
      const current = s.playback.current;
      if (!current) return "Nothing is playing.";
      s.preferences.update({
        savedIds: s.preferences.savedIds.filter((id) => id !== current.id),
      });
      return "Removed from saved";
    }
    case "downloadCurrent": {
      const current = s.playback.current;
      if (!current) return "Nothing is playing. Start a story first.";
      if (s.preferences.downloadedIds.includes(current.id))
        return "Already downloaded.";
      s.preferences.update({
        downloadedIds: [...s.preferences.downloadedIds, current.id],
      });
      return "Download started";
    }
    case "removeDownload": {
      const current = s.playback.current;
      if (!current) return "Nothing is playing.";
      s.preferences.update({
        downloadedIds: s.preferences.downloadedIds.filter(
          (id) => id !== current.id,
        ),
      });
      return "Download removed";
    }
    case "follow": {
      const entity = s.data.entities.find(
        (item) => item.id === command.entityId,
      );
      s.preferences.update({
        followingIds: [
          ...new Set([...s.preferences.followingIds, command.entityId]),
        ],
      });
      return entity ? `Now following ${entity.name}` : "Now following";
    }
    case "unfollow": {
      const entity = s.data.entities.find(
        (item) => item.id === command.entityId,
      );
      s.preferences.update({
        followingIds: s.preferences.followingIds.filter(
          (id) => id !== command.entityId,
        ),
      });
      return entity ? `Unfollowed ${entity.name}` : "Unfollowed";
    }
    case "whatIsThis": {
      const current = s.playback.current;
      if (!current) return "Nothing is playing. Start a story first.";
      return (
        current.description ?? "There is no description for this story yet."
      );
    }
    case "whoMadeThis": {
      const current = s.playback.current;
      if (!current) return "Nothing is playing. Start a story first.";
      return `Made by ${current.creator}, published by ${current.publication}.`;
    }
    case "sleepTimer":
      s.playback.setSleepTimer(command.minutes);
      return `Sleep timer set for ${command.minutes} minutes`;
    case "cancelSleepTimer":
      s.playback.cancelSleepTimer();
      return "Sleep timer cancelled";
    case "addToQueue": {
      if (!s.playback.current) return "Nothing is playing.";
      s.playback.addToQueue();
      return "Added to your queue";
    }
    case "openQueue":
      return "Your queue appears under the player.";
    case "clearQueue":
      s.playback.clearQueue();
      return "Queue cleared";
    case "changeLocation":
      s.navigate.push(routes.settings);
      return "Local area is in Settings. Opening Settings.";
    case "help":
      return "Try play local news, open saved, next, rewind 15 seconds, speed up, set a sleep timer for 20 minutes, or ask what this story is about.";
    case "openAppSettings":
      s.navigate.push(settingsSectionRoute("experience", "privacy"));
      return "Opening privacy settings in Hear!";
    case "openAudioSettings":
      s.navigate.push(settingsSectionRoute("connections", "audio"));
      return "Opening audio settings in Hear!";
    case "openBluetoothSettings":
      s.navigate.push(settingsSectionRoute("connections", "bluetooth"));
      return "Opening Bluetooth settings in Hear!";
    case "openInternetSettings":
      s.navigate.push(settingsSectionRoute("connections", "internet"));
      return "Opening internet settings in Hear!";
    case "openWifiSettings":
      s.navigate.push(settingsSectionRoute("connections", "wifi"));
      return "Opening Wi-Fi settings in Hear!";
    case "openAccessibilitySettings":
      s.navigate.push(settingsSectionRoute("experience", "accessibility"));
      return "Opening accessibility settings in Hear!";
    case "openLocationSettings":
      s.navigate.push(settingsSectionRoute("experience", "location"));
      return "Opening location settings in Hear!";
    case "resetVoiceCorrections":
      void s.voiceData.resetVoiceCorrections();
      return "Learned voice corrections reset";
    case "readScreen":
      return s.readScreen();
    case "accountSignIn":
      accountVoiceBridge.dispatch("signIn");
      return "Opening account sign-in.";
    case "accountSignOut":
      accountVoiceBridge.dispatch("signOut");
      return "Signing out of Hear.";
    case "onboardingContinue": {
      const step = onboardingVoiceBridge.currentStep();
      if (!step) return "Set up Hear! is not open.";
      onboardingVoiceBridge.dispatch({ type: "continue" });
      return "Continuing setup.";
    }
    case "onboardingBack": {
      onboardingVoiceBridge.dispatch({ type: "back" });
      return "Going back a step.";
    }
    case "onboardingSkip": {
      onboardingVoiceBridge.dispatch({ type: "skip" });
      return "Skipping this step.";
    }
    case "onboardingSetTown": {
      onboardingVoiceBridge.dispatch({
        type: "setTown",
        locationId: command.locationId,
        name: command.name,
      });
      return `Town set to ${command.name}`;
    }
    case "onboardingRead": {
      const step = onboardingVoiceBridge.currentStep();
      onboardingVoiceBridge.dispatch({ type: "read" });
      if (!step) return "Set up Hear! is not open.";
      const title = step.title.replace(/[.!?]+$/, "");
      const description = step.description.replace(/[.!?]+$/, "");
      return `Step ${step.stepIndex + 1} of ${step.totalSteps}. ${title}. ${description}.`;
    }
    case "onboardingUseSpokenSetup":
      onboardingVoiceBridge.dispatch({ type: "useSpokenSetup" });
      return "Spoken setup enabled.";
    case "onboardingUseScreenControls":
      onboardingVoiceBridge.dispatch({ type: "useScreenControls" });
      return "Screen controls selected.";
    case "onboardingPlaySoundCheck":
      onboardingVoiceBridge.dispatch({ type: "playSoundCheck" });
      return "Playing the sound check.";
    case "onboardingCannotHear":
      onboardingVoiceBridge.dispatch({ type: "cannotHear" });
      return "Opening sound check help.";
    case "onboardingUseLocation":
      onboardingVoiceBridge.dispatch({ type: "useLocation" });
      return "Finding your approximate area.";
    default:
      return null;
  }
}

function navigate(
  target: "home" | "discover" | "library" | "settings" | "player",
  services: VoiceServices,
): string {
  if (target === "settings") {
    services.navigate.push(routes.settings);
    return "Opening Settings";
  }

  if (target === "player") {
    if (!services.playback.current) {
      return "Nothing is playing yet. Say play local news to start.";
    }

    services.navigate.push(routes.player);
    return "Opening the player";
  }

  const tabRoutes = {
    home: routes.home,
    discover: routes.discover,
    library: routes.library,
  } as const;

  services.navigate.replace(tabRoutes[target]);
  return `Opening ${target[0].toUpperCase()}${target.slice(1)}`;
}

const EXECUTOR_KEYS = new Set<VoiceExecutorKey>([
  "navigate",
  "close",
  "cancel",
  "openLibrarySection",
  "openTopic",
  "setLocation",
  "search",
  "play",
  "pause",
  "resume",
  "next",
  "previous",
  "restart",
  "repeat",
  "seek",
  "speed",
  "speedStep",
  "saveCurrent",
  "removeSaved",
  "downloadCurrent",
  "removeDownload",
  "follow",
  "unfollow",
  "whatIsThis",
  "whoMadeThis",
  "sleepTimer",
  "cancelSleepTimer",
  "addToQueue",
  "openQueue",
  "clearQueue",
  "changeLocation",
  "help",
  "openAppSettings",
  "openAudioSettings",
  "openBluetoothSettings",
  "openInternetSettings",
  "openWifiSettings",
  "openAccessibilitySettings",
  "openLocationSettings",
  "resetVoiceCorrections",
  "readScreen",
  "accountSignIn",
  "accountSignOut",
  "onboardingContinue",
  "onboardingBack",
  "onboardingSkip",
  "onboardingSetTown",
  "onboardingRead",
  "onboardingUseSpokenSetup",
  "onboardingUseScreenControls",
  "onboardingPlaySoundCheck",
  "onboardingCannotHear",
  "onboardingUseLocation",
]);

class AppVoiceExecutor implements VoiceExecutor {
  private completed = new Map<string, number>();
  private chain = Promise.resolve<VoiceExecutionResult>({ ok: true });

  execute(invocation: VoiceInvocation, services: VoiceServices) {
    this.prune();
    if (!this.valid(invocation))
      return Promise.resolve({
        ok: false,
        errorCode: "invalid-invocation" as const,
      });
    if (this.completed.has(invocation.idempotencyKey))
      return Promise.resolve({ ok: false, errorCode: "duplicate" as const });
    this.completed.set(invocation.idempotencyKey, Date.now());
    const task = this.chain.then(() => {
      try {
        return {
          ok: true,
          feedback: runCommand(invocation.command, services) ?? undefined,
        };
      } catch {
        return { ok: false, errorCode: "execution-failed" as const };
      }
    });
    this.chain = task;
    return task;
  }

  private valid(invocation: VoiceInvocation) {
    return (
      EXECUTOR_KEYS.has(invocation.executorKey) &&
      invocation.command.type === invocation.executorKey &&
      invocation.confidence >= 0 &&
      invocation.confidence <= 1 &&
      !!invocation.recognitionSessionId
    );
  }

  private prune() {
    const cutoff = Date.now() - 300000;
    for (const [key, time] of this.completed)
      if (time < cutoff) this.completed.delete(key);
  }
}

export const voiceExecutor: VoiceExecutor = new AppVoiceExecutor();
