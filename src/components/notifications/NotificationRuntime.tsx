import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { stories } from "@/data/catalogue";
import { usePlaybackStore, usePreferencesStore } from "@/stores";
import {
  checkAndNotifyFollowedReleases,
  requestNotificationPermissionsSafely,
  setupNotificationResponseListener,
} from "@/services/notifications/notification-service";

export function NotificationRuntime() {
  const router = useRouter();
  const followingIds = usePreferencesStore((state) => state.followingIds);
  const notificationsEnabled = usePreferencesStore(
    (state) => state.notificationsEnabled,
  );
  const notifiedReleaseIds = usePreferencesStore(
    (state) => state.notifiedReleaseIds,
  );
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );

  const prevFollowingCount = useRef(followingIds.length);

  useEffect(() => {
    const cleanup = setupNotificationResponseListener((storyId) => {
      const story = stories.find((s) => s.id === storyId);
      if (story) {
        usePlaybackStore.getState().play(story);
        router.push("/player");
      }
    });

    return () => cleanup();
  }, [router]);

  useEffect(() => {
    if (!notificationsEnabled || followingIds.length === 0) {
      prevFollowingCount.current = followingIds.length;
      return;
    }

    let isMounted = true;

    void (async () => {
      await requestNotificationPermissionsSafely();

      const newlyNotified = await checkAndNotifyFollowedReleases(
        followingIds,
        notifiedReleaseIds,
      );

      if (isMounted && newlyNotified.length > 0) {
        updatePreferences({
          notifiedReleaseIds: [
            ...new Set([...notifiedReleaseIds, ...newlyNotified]),
          ],
        });
      }
    })();

    prevFollowingCount.current = followingIds.length;

    return () => {
      isMounted = false;
    };
  }, [followingIds, notificationsEnabled, notifiedReleaseIds, updatePreferences]);

  return null;
}
