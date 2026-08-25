import type { ContentItem, Entity } from "@/types";
import { findReleasesForFollowedCreators } from "@/utils/notification-releases";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const NEW_RELEASES_CHANNEL_ID = "new-releases-v2";
let channelConfigured = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function hasNotificationPermission(
  settings: Notifications.NotificationPermissionsStatus,
): boolean {
  return (
    settings.granted ||
    settings.ios?.status ===
    Notifications.IosAuthorizationStatus.PROVISIONAL ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED
  );
}

export async function setupNotificationChannelAsync(): Promise<void> {
  if (channelConfigured || Platform.OS !== "android") return;

  try {
    await Notifications.setNotificationChannelAsync(NEW_RELEASES_CHANNEL_ID, {
      name: "New Releases",
      description:
        "Notifications for new tracks and publications from followed creators",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#7B3068",
    });
    channelConfigured = true;
  } catch { }
}

export async function requestNotificationPermissionsSafely(): Promise<boolean> {
  try {
    await setupNotificationChannelAsync();
    const currentSettings = await Notifications.getPermissionsAsync();
    if (hasNotificationPermission(currentSettings)) return true;

    const requestedSettings = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return hasNotificationPermission(requestedSettings);
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
        sound: true,
        categoryIdentifier: "new-releases",
      },
      trigger:
        Platform.OS === "android"
          ? { channelId: NEW_RELEASES_CHANNEL_ID }
          : null,
    });
  } catch {
    return undefined;
  }
}

export async function checkAndNotifyFollowedReleases(
  followingIds: string[],
  alreadyNotifiedIds: string[] = [],
): Promise<string[]> {
  const releases = findReleasesForFollowedCreators(
    followingIds,
    alreadyNotifiedIds,
  );
  const notifiedStoryIds: string[] = [];

  for (const { creator, story } of releases) {
    const notificationId = await notifyNewRelease(creator, story);
    if (notificationId) notifiedStoryIds.push(story.id);
  }

  return notifiedStoryIds;
}

export function setupNotificationResponseListener(
  onOpenStory: (storyId: string) => void,
): () => void {
  const subscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const storyId = response.notification.request.content.data?.storyId;
      if (typeof storyId === "string") onOpenStory(storyId);
    });

  return () => subscription.remove();
}

export { findReleasesForFollowedCreators };

