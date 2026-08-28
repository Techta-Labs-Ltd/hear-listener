import {
  findReleasesForFollowedCreators,
  notifyNewRelease,
  setupNotificationResponseListener,
} from "@/services/notifications/notification-service";
import * as Notifications from "expo-notifications";
import type { ContentItem, Entity } from "@/types";

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue("notif-123"),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({
    remove: jest.fn(),
  }),
  AndroidImportance: {
    HIGH: 4,
  },
  IosAuthorizationStatus: {
    AUTHORIZED: 2,
    PROVISIONAL: 3,
  },
}));

describe("notifications service", () => {
  const sampleCreator: Entity = {
    id: "hear-daily",
    name: "Hear Daily",
    kind: "publication",
    description: "Daily briefs",
  };

  const sampleStory: ContentItem[] = [
    {
      id: "daily",
      title: "The stories shaping your evening",
      creator: "Hear Daily",
      publication: "Today",
      duration: "18 min",
      category: "Continue",
      color: "#7B3068",
      topicIds: ["local"],
    },
  ];

  it("finds new releases matching followed creator IDs", () => {
    const releases = findReleasesForFollowedCreators(
      ["hear-daily"],
      [],
      [sampleCreator],
      sampleStory,
    );
    expect(releases.length).toBeGreaterThan(0);
    expect(releases[0]?.creator.id).toBe("hear-daily");
  });

  it("excludes creators that are not followed", () => {
    const releases = findReleasesForFollowedCreators(
      ["non-existent-creator"],
      [],
      [sampleCreator],
      sampleStory,
    );
    expect(releases).toEqual([]);
  });

  it("excludes already notified story IDs to avoid duplicate alerts", () => {
    const releases = findReleasesForFollowedCreators(
      ["hear-daily"],
      ["daily", "morning-headlines"],
      [sampleCreator],
      sampleStory,
    );
    const hasDaily = releases.some((r) => r.story.id === "daily" || r.story.id === "morning-headlines");
    expect(hasDaily).toBe(false);
  });

  it("schedules a notification with correct title, body, and payload data", async () => {
    const id = await notifyNewRelease(sampleCreator, sampleStory[0]!);
    expect(id).toBe("notif-123");
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: "New from Hear Daily",
          body: "“The stories shaping your evening” is now ready to play.",
          data: {
            storyId: "daily",
            creatorId: "hear-daily",
            type: "new_release",
          },
        }),
      }),
    );
  });

  it("handles notification response and triggers onOpenStory", () => {
    let listenerCallback: ((response: unknown) => void) | undefined;
    (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockImplementationOnce(
      (cb: (response: unknown) => void) => {
        listenerCallback = cb;
        return { remove: jest.fn() };
      },
    );

    const onOpenStory = jest.fn();
    setupNotificationResponseListener(onOpenStory);

    expect(listenerCallback).toBeDefined();
    listenerCallback!({
      notification: {
        request: {
          content: {
            data: {
              storyId: "daily",
              creatorId: "hear-daily",
              type: "new_release",
            },
          },
        },
      },
    });

    expect(onOpenStory).toHaveBeenCalledWith("daily");
  });
});
