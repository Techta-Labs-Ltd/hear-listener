import type { ContentItem, Entity } from "./content";

export type NotificationContextValue = {
  hasPermission: boolean;
  requestPermissions: () => Promise<boolean>;
  sendReleaseNotification: (
    creator: Entity,
    story: ContentItem,
  ) => Promise<string | undefined>;
  checkForNewReleases: () => Promise<string[]>;
};

export type NotificationReleaseMatch = {
  creator: Entity;
  story: ContentItem;
};

export type NotificationPayloadData = {
  storyId?: string;
  creatorId?: string;
  type?: string;
  [key: string]: unknown;
};
