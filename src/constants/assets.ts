/**
 * Hear! App Asset Registry
 *
 * Centralized, strongly-typed catalog of all application assets.
 * Backed by Expo asset bundling configured in app.json.
 */

export const appAssets = {
  images: {
    logo: require("@/assets/images/hear-logo.png"),
    icon: require("@/assets/images/hear-icon.png"),
    foreground: require("@/assets/images/hear-foreground.png"),
    favicon: require("@/assets/images/favicon.png"),
  },
  database: {
    voiceSeed: require("@/assets/database/hear-voice-seed.db"),
  },
  audio: {
    demoStory: require("@/assets/audio/demo-story.wav"),
    click: require("@/assets/audio/click.wav"),
    splash: require("@/assets/audio/splash.wav"),
  },
} as const;

/**
 * Preload array used during app initialization in AppRoot.
 */
export const ALL_APP_ASSETS = [
  appAssets.images.logo,
  appAssets.database.voiceSeed,
  appAssets.audio.demoStory,
  appAssets.audio.click,
  appAssets.audio.splash,
];
