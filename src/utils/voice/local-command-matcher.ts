import { PLAYBACK_SPEED_OPTIONS } from "@/constants/voice-execution";
import { LOCAL_COMMAND_DICTIONARY } from "@/constants/voice-dictionary";
import type {
  LocalCommandSpec,
  ScreenVoiceCapability,
  SpeedMultiplier,
  VoiceCommand,
  VoiceInvocation,
} from "@/types";
import { makeInvocation } from "./matching/invocation";

const localCommandSpecs: LocalCommandSpec[] = [
  { id: "pause", executorKey: "pause" },
  { id: "resume", executorKey: "resume" },
  { id: "next", executorKey: "next" },
  { id: "previous", executorKey: "previous" },
  { id: "restart", executorKey: "restart" },
  ...(["home", "library", "discover", "settings", "player"] as const).map(
    (target): LocalCommandSpec => ({
      id: `navigate:${target}`,
      executorKey: "navigate",
      build: () => ({ type: "navigate", target }),
    }),
  ),
  ...(["saved", "downloads", "history", "following"] as const).map(
    (section): LocalCommandSpec => ({
      id: `openLibrarySection:${section}`,
      executorKey: "openLibrarySection",
      build: () => ({ type: "openLibrarySection", section }),
    }),
  ),
  { id: "openQueue", executorKey: "openQueue" },
  {
    id: "clearQueue",
    executorKey: "clearQueue",
    risk: "destructive",
    confirm: true,
  },
  { id: "readScreen", executorKey: "readScreen" },
  { id: "help", executorKey: "help" },
  { id: "close", executorKey: "close" },
  { id: "cancel", executorKey: "cancel" },
  { id: "saveCurrent", executorKey: "saveCurrent" },
  {
    id: "removeSaved",
    executorKey: "removeSaved",
    risk: "destructive",
    confirm: true,
  },
  { id: "downloadCurrent", executorKey: "downloadCurrent" },
  {
    id: "removeDownload",
    executorKey: "removeDownload",
    risk: "destructive",
    confirm: true,
  },
  { id: "addToQueue", executorKey: "addToQueue" },
  { id: "openAppSettings", executorKey: "openAppSettings" },
  { id: "openAudioSettings", executorKey: "openAudioSettings" },
  { id: "openBluetoothSettings", executorKey: "openBluetoothSettings" },
  { id: "openInternetSettings", executorKey: "openInternetSettings" },
  { id: "openWifiSettings", executorKey: "openWifiSettings" },
  {
    id: "openAccessibilitySettings",
    executorKey: "openAccessibilitySettings",
  },
  { id: "openLocationSettings", executorKey: "openLocationSettings" },
  {
    id: "resetVoiceCorrections",
    executorKey: "resetVoiceCorrections",
    risk: "destructive",
    confirm: true,
  },
  {
    id: "repeat:on",
    executorKey: "repeat",
    build: () => ({ type: "repeat", mode: "on" }),
  },
  {
    id: "repeat:off",
    executorKey: "repeat",
    build: () => ({ type: "repeat", mode: "off" }),
  },
  { id: "cancelSleepTimer", executorKey: "cancelSleepTimer" },
  {
    id: "speedStep:up",
    executorKey: "speedStep",
    build: () => ({ type: "speedStep", direction: "up" }),
  },
  {
    id: "speedStep:down",
    executorKey: "speedStep",
    build: () => ({ type: "speedStep", direction: "down" }),
  },
  {
    id: "accountSignIn",
    executorKey: "accountSignIn",
    risk: "privacy",
    confirm: true,
  },
  {
    id: "accountSignOut",
    executorKey: "accountSignOut",
    risk: "privacy",
    confirm: true,
  },
  ...([
    "onboardingContinue",
    "onboardingBack",
    "onboardingSkip",
    "onboardingRead",
    "onboardingPlaySoundCheck",
    "onboardingUseSpokenSetup",
    "onboardingUseScreenControls",
    "onboardingUseLocation",
    "onboardingCannotHear",
  ] as const).map(
    (id): LocalCommandSpec => ({
      id,
      executorKey: id,
      onboardingOnly: true,
    }),
  ),
];

export function isPlaybackSpeedIntent(normalized: string): boolean {
  return (
    /\b(?:speed|rate)\b/.test(normalized) &&
    /\b(?:set|change|play|playback|play back|at|normal|regular|reset|speed|rate)\b/.test(
      normalized,
    )
  );
}

export function matchLocalCommand(
  normalized: string,
  sessionId: string,
  snapshot?: ScreenVoiceCapability | null,
  context?: Record<string, unknown>,
): VoiceInvocation | undefined {
  if (
    normalized === "stop" ||
    normalized === "stop playing" ||
    normalized === "stop the audio"
  ) {
    return matchStop(context, sessionId);
  }

  const onboarding = isOnboardingScreen(snapshot, context);
  for (const spec of localCommandSpecs) {
    if (spec.onboardingOnly && !onboarding) continue;
    const phrases = LOCAL_COMMAND_DICTIONARY[spec.id] ?? [];
    if (!phrases.includes(normalized)) continue;
    const command =
      spec.build?.(sessionId, normalized) ??
      ({ type: spec.executorKey } as VoiceCommand);
    return makeInvocation({
      sessionId,
      actionId: spec.id,
      executorKey: spec.executorKey,
      command,
      risk: spec.risk,
      requiresConfirmation: spec.confirm,
    });
  }

  const prefixed = matchPrefixedCommand(normalized);
  if (!prefixed) return undefined;
  return makeInvocation({
    sessionId,
    actionId: prefixed.id,
    executorKey: prefixed.id as VoiceInvocation["executorKey"],
    command: prefixed.command,
  });
}

function matchStop(
  context: Record<string, unknown> | undefined,
  sessionId: string,
): VoiceInvocation {
  const playback = context?.playback as { playing?: boolean } | undefined;
  return playback?.playing
    ? makeInvocation({
        sessionId,
        actionId: "pause",
        executorKey: "pause",
        command: { type: "pause" },
      })
    : makeInvocation({
        sessionId,
        actionId: "cancel",
        executorKey: "cancel",
        command: { type: "cancel" },
      });
}

function isOnboardingScreen(
  snapshot?: ScreenVoiceCapability | null,
  context?: Record<string, unknown>,
): boolean {
  const path =
    snapshot?.routeKey ??
    (context?.currentPath as string | undefined) ??
    (context?.pathname as string | undefined);
  return (
    snapshot?.screenId === "onboarding" ||
    path === "/onboarding" ||
    path?.startsWith("/onboarding") === true
  );
}

function matchPrefixedCommand(
  normalized: string,
): { id: string; command: VoiceCommand } | undefined {
  const sleepPrefixes = [
    "set a sleep timer for ",
    "set sleep timer for ",
    "sleep timer for ",
    "set a sleep timer ",
    "sleep timer ",
  ];
  for (const prefix of sleepPrefixes) {
    if (normalized.startsWith(prefix)) {
      const minutes = numberFrom(normalized.slice(prefix.length)) ?? 20;
      return { id: "sleepTimer", command: { type: "sleepTimer", minutes } };
    }
  }

  const seekPrefixes: [string, "forward" | "backward"][] = [
    ["skip forward ", "forward"],
    ["fast forward ", "forward"],
    ["forward ", "forward"],
    ["rewind ", "backward"],
    ["go back ", "backward"],
    ["back ", "backward"],
  ];
  for (const [prefix, direction] of seekPrefixes) {
    if (normalized.startsWith(prefix)) {
      const seconds = numberFrom(normalized.slice(prefix.length)) ?? 15;
      return { id: "seek", command: { type: "seek", seconds, direction } };
    }
  }
  return matchPlaybackSpeed(normalized);
}

function matchPlaybackSpeed(
  normalized: string,
): { id: string; command: VoiceCommand } | undefined {
  const phrases = [
    /\b(?:set|change)\s+(?:the\s+)?(?:play\s+back\s+|playback\s+|play\s+)?(?:speed|rate)(?:\s+to)?\s+(.+)$/,
    /\b(?:play\s+at|at)\s+(.+?)\s+(?:speed|x)\b/,
    /\b(.+?)\s+(?:times\s+)?(?:normal\s+)?speed\b/,
    /\bspeed(?:\s+to)?\s+(.+)$/,
  ];
  for (const phrase of phrases) {
    const match = normalized.match(phrase);
    const multiplier = playbackSpeedFrom(match?.[1] ?? normalized);
    if (
      multiplier !== undefined &&
      PLAYBACK_SPEED_OPTIONS.includes(multiplier)
    ) {
      return { id: "speed", command: { type: "speed", multiplier } };
    }
  }
  return undefined;
}

function playbackSpeedFrom(value: string): SpeedMultiplier | undefined {
  const normalized = value
    .replace(/\b(?:times\s+normal|times|x)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return PLAYBACK_SPEED_ALIASES[normalized];
}

const PLAYBACK_SPEED_ALIASES: Readonly<Record<string, SpeedMultiplier>> = {
  "0 5": 0.5,
  "0 point 5": 0.5,
  "zero point five": 0.5,
  half: 0.5,
  first: 0.5,
  "first speed": 0.5,
  "first level": 0.5,
  "0 75": 0.75,
  "0 point 7 5": 0.75,
  "zero point seven five": 0.75,
  "three quarter": 0.75,
  "three quarters": 0.75,
  "three quarter speed": 0.75,
  second: 0.75,
  "second speed": 0.75,
  "second level": 0.75,
  "1": 1,
  one: 1,
  "1 0": 1,
  "1 point 0": 1,
  "one point zero": 1,
  third: 1,
  "third speed": 1,
  "third level": 1,
  normal: 1,
  regular: 1,
  reset: 1,
  "normal speed": 1,
  "regular speed": 1,
  "reset speed": 1,
  "1 25": 1.25,
  "1 point 2 5": 1.25,
  "one point two five": 1.25,
  "one and a quarter": 1.25,
  "1 and a quarter": 1.25,
  fourth: 1.25,
  "fourth speed": 1.25,
  "fourth level": 1.25,
  "1 5": 1.5,
  "1 point 5": 1.5,
  "one point five": 1.5,
  "one and a half": 1.5,
  "1 and a half": 1.5,
  fifth: 1.5,
  "fifth speed": 1.5,
  "fifth level": 1.5,
  "2": 2,
  two: 2,
  double: 2,
  "double speed": 2,
  sixth: 2,
  "sixth speed": 2,
  "sixth level": 2,
};

function numberFrom(value: string): number | undefined {
  return Number(value.match(/\b(\d{1,3})\b/)?.[1] ?? NaN) || undefined;
}
