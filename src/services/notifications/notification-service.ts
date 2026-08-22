import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { entities, stories } from "@/data/catalogue";
import type { ContentItem, Entity } from "@/types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let channelConfigured = false;

export async function setupNotificationChannelAsync(): Promise<void> {
  if (channelConfigured || Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync("new-releases", {
      name: "New Releases",
      description: "Notifications for new tracks and publications from followed creators",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#7B3068",
      sound: "default",
    });
    channelConfigured = true;
  } catch {}
}

export async function requestNotificationPermissionsSafely(): Promise<boolean> {
  try {
    await setupNotificationChannelAsync();
    const settings = await Notifications.getPermissionsAsync();
    if (
      settings.granted ||
      settings.ios?.status ===
        Notifications.IosAuthorizationStatus.PROVISIONAL ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED
    ) {
      return true;
    }

    const request = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    return (
      request.granted ||
      request.ios?.status ===
        Notifications.IosAuthorizationStatus.PROVISIONAL ||
      request.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED
    );
  } catch {
    return false;
  }
}

export async function notifyNewRelease(
  creator: Entity,
  story: ContentItem,
): Promise<string | undefined> {
  try {
    await setupNotificationChannelAsync();
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `New from ${creator.name}`,
        body: `“${story.title}” is now ready to play.`,
        data: {
          storyId: story.id,
          creatorId: creator.id,
          type: "new_release",
        },
        sound: "default",
        categoryIdentifier: "new-releases",
      },
      trigger: null,
    });
  } catch {
    return undefined;
  }
}

export function findReleasesForFollowedCreators(
  followingIds: string[],
  alreadyNotifiedIds: string[] = [],
): { creator: Entity; story: ContentItem }[] {
  if (!followingIds || followingIds.length === 0) return [];

  const followedEntities = entities.filter((e) => followingIds.includes(e.id));
  if (followedEntities.length === 0) return [];

  const releases: { creator: Entity; story: ContentItem }[] = [];

  for (const entity of followedEntities) {
    const creatorName = entity.name.toLowerCase().trim();
    const matchingStories = stories.filter((story) => {
      const matchCreator =
        story.creator.toLowerCase().trim() === creatorName ||
        story.id.startsWith(entity.id);
      const matchPub =
        story.publication.toLowerCase().trim() === creatorName;
      return (matchCreator || matchPub) && !alreadyNotifiedIds.includes(story.id);
    });

    for (const story of matchingStories) {
      releases.push({ creator: entity, story });
    }
  }

  return releases;
}

export async function checkAndNotifyFollowedReleases(
  followingIds: string[],
  alreadyNotifiedIds: string[] = [],
): Promise<string[]> {
  const newReleases = findReleasesForFollowedCreators(
    followingIds,
    alreadyNotifiedIds,
  );

  const newlyNotified: string[] = [];

  for (const { creator, story } of newReleases) {
    const id = await notifyNewRelease(creator, story);
    if (id) {
      newlyNotified.push(story.id);
    }
  }

  return newlyNotified;
}

export function setupNotificationResponseListener(
  onOpenStory: (storyId: string) => void,
) {
  const subscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data && typeof data.storyId === "string") {
        onOpenStory(data.storyId);
      }
    });

  return () => {
    subscription.remove();
  };
}
