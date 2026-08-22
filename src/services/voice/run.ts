import type { VoiceCommand, VoiceServices } from "@/types";
import {
  librarySectionRoute,
  routes,
  settingsSectionRoute,
} from "@/navigation/routes";
import { onboardingVoiceBridge } from "@/stores/onboarding-voice-store";
import { accountVoiceBridge } from "@/stores/account-command-store";
import { searchCatalogue } from "@/utils/search";
import { runPlayCommand } from "./play-commands";

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
