import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "expo-router";
import {
  useContentStore,
  usePlaybackStore,
  usePreferencesStore,
} from "@/stores";
import {
  checkAndNotifyFollowedReleases,
  notifyNewRelease,
  requestNotificationPermissionsSafely,
  setupNotificationChannelAsync,
  setupNotificationResponseListener,
} from "@/services/notifications/notification-service";
import type { ContentItem, Entity, NotificationContextValue } from "@/types";

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState(false);

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

  // Setup notification channel on Android on startup
  useEffect(() => {
    void setupNotificationChannelAsync();
  }, []);

  // Setup response listener for tap-to-open story playback
  useEffect(() => {
    const cleanup = setupNotificationResponseListener((storyId) => {
      const story = useContentStore.getState().getStoryById(storyId);
      if (story) {
        usePlaybackStore.getState().play(story);
        router.push("/player");
      }
    });

    return () => {
      cleanup();
    };
  }, [router]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const granted = await requestNotificationPermissionsSafely();
    setHasPermission(granted);
    return granted;
  }, []);

  const sendReleaseNotification = useCallback(
    async (creator: Entity, story: ContentItem): Promise<string | undefined> => {
      return notifyNewRelease(creator, story);
    },
    [],
  );

  const checkForNewReleases = useCallback(async (): Promise<string[]> => {
    if (!notificationsEnabled || followingIds.length === 0) {
      return [];
    }

    await requestPermissions();

    const newlyNotified = await checkAndNotifyFollowedReleases(
      followingIds,
      notifiedReleaseIds,
      useContentStore.getState(),
    );

    if (newlyNotified.length > 0) {
      updatePreferences({
        notifiedReleaseIds: [
          ...new Set([...notifiedReleaseIds, ...newlyNotified]),
        ],
      });
    }

    return newlyNotified;
  }, [
    followingIds,
    notificationsEnabled,
    notifiedReleaseIds,
    requestPermissions,
    updatePreferences,
  ]);

  // Automatically check followed releases when preferences or follow lists change
  useEffect(() => {
    if (!notificationsEnabled || followingIds.length === 0) {
      prevFollowingCount.current = followingIds.length;
      return;
    }

    let isMounted = true;
    void (async () => {
      await checkForNewReleases();
      if (isMounted) {
        prevFollowingCount.current = followingIds.length;
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [checkForNewReleases, followingIds.length, notificationsEnabled]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      hasPermission,
      requestPermissions,
      sendReleaseNotification,
      checkForNewReleases,
    }),
    [
      hasPermission,
      requestPermissions,
      sendReleaseNotification,
      checkForNewReleases,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
}
