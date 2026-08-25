import type {
  LocalRoutingResult,
  PendingRouterContext,
  ScreenVoiceCapability,
  VoiceCommand,
  VoiceHypothesis,
  VoiceInvocation,
  VoiceResolveRequest,
} from "@/types";
import { normalizeVoiceText } from "./normalize";
import { voiceResolver } from "./resolver";
import { makeInvocation } from "./matching/invocation";
import { ambiguityController } from "./ambiguity-controller";
import { pendingInteractionRouter } from "./pending-interaction-router";
import { LOCAL_COMMAND_DICTIONARY } from "./recognition-dictionary";
import { usePreferencesStore } from "@/stores/preferences-store";

type LocalCommandSpec = {
  id: string;
  executorKey: VoiceInvocation["executorKey"];
  risk?: VoiceInvocation["risk"];
  confirm?: boolean;
  onboardingOnly?: boolean;
  build?: (
    sessionId: string,
    normalized: string,
  ) => VoiceCommand;
};

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

const LOCAL_COMMANDS: LocalCommandSpec[] = [
  { id: "pause", executorKey: "pause" },
  { id: "resume", executorKey: "resume" },
  { id: "next", executorKey: "next" },
  { id: "previous", executorKey: "previous" },
  { id: "restart", executorKey: "restart" },
  {
    id: "navigate:home",
    executorKey: "navigate",
    build: () => ({ type: "navigate", target: "home" }),
  },
  {
    id: "navigate:library",
    executorKey: "navigate",
    build: () => ({ type: "navigate", target: "library" }),
  },
  {
    id: "navigate:discover",
    executorKey: "navigate",
    build: () => ({ type: "navigate", target: "discover" }),
  },
  {
    id: "navigate:settings",
    executorKey: "navigate",
    build: () => ({ type: "navigate", target: "settings" }),
  },
  {
    id: "navigate:player",
    executorKey: "navigate",
    build: () => ({ type: "navigate", target: "player" }),
  },
  {
    id: "openLibrarySection:saved",
    executorKey: "openLibrarySection",
    build: () => ({ type: "openLibrarySection", section: "saved" }),
  },
  {
    id: "openLibrarySection:downloads",
    executorKey: "openLibrarySection",
    build: () => ({ type: "openLibrarySection", section: "downloads" }),
  },
  {
    id: "openLibrarySection:history",
    executorKey: "openLibrarySection",
    build: () => ({ type: "openLibrarySection", section: "history" }),
  },
  {
    id: "openLibrarySection:following",
    executorKey: "openLibrarySection",
    build: () => ({ type: "openLibrarySection", section: "following" }),
  },
  { id: "openQueue", executorKey: "openQueue" },
  { id: "clearQueue", executorKey: "clearQueue", risk: "destructive", confirm: true },
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
  { id: "openAccessibilitySettings", executorKey: "openAccessibilitySettings" },
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
  { id: "accountSignIn", executorKey: "accountSignIn", risk: "privacy", confirm: true },
  { id: "accountSignOut", executorKey: "accountSignOut", risk: "privacy", confirm: true },
  { id: "onboardingContinue", executorKey: "onboardingContinue", onboardingOnly: true },
  { id: "onboardingBack", executorKey: "onboardingBack", onboardingOnly: true },
  { id: "onboardingSkip", executorKey: "onboardingSkip", onboardingOnly: true },
  { id: "onboardingRead", executorKey: "onboardingRead", onboardingOnly: true },
  {
    id: "onboardingPlaySoundCheck",
    executorKey: "onboardingPlaySoundCheck",
    onboardingOnly: true,
  },
  {
    id: "onboardingUseSpokenSetup",
    executorKey: "onboardingUseSpokenSetup",
    onboardingOnly: true,
  },
  {
    id: "onboardingUseScreenControls",
    executorKey: "onboardingUseScreenControls",
    onboardingOnly: true,
  },
  {
    id: "onboardingUseLocation",
    executorKey: "onboardingUseLocation",
    onboardingOnly: true,
  },
  {
    id: "onboardingCannotHear",
    executorKey: "onboardingCannotHear",
    onboardingOnly: true,
  },
];

function numberFrom(value: string): number | undefined {
  return Number(value.match(/\b(\d{1,3})\b/)?.[1] ?? NaN) || undefined;
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
  const speedPrefixes = ["set speed to ", "speed ", "set the speed to "];
  for (const prefix of speedPrefixes) {
    if (normalized.startsWith(prefix)) {
      const raw = numberFrom(normalized.slice(prefix.length));
      if (raw !== undefined) {
        const multiplier = SPEED_OPTIONS.includes(raw)
          ? (raw as 0.75 | 1 | 1.25 | 1.5 | 2)
          : 1;
        return { id: "speed", command: { type: "speed", multiplier } };
      }
    }
  }
  return undefined;
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

function matchStop(
  context: Record<string, unknown> | undefined,
  sessionId: string,
): VoiceInvocation {
  const playback = context?.playback as { playing?: boolean } | undefined;
  if (playback?.playing) {
    return makeInvocation({
      sessionId,
      actionId: "pause",
      executorKey: "pause",
      command: { type: "pause" },
    });
  }
  return makeInvocation({
    sessionId,
    actionId: "cancel",
    executorKey: "cancel",
    command: { type: "cancel" },
  });
}

function matchLocalCommand(
  normalized: string,
  sessionId: string,
  snapshot?: ScreenVoiceCapability | null,
  context?: Record<string, unknown>,
): VoiceInvocation | undefined {
  if (normalized === "stop" || normalized === "stop playing" || normalized === "stop the audio") {
    return matchStop(context, sessionId);
  }

  const onboarding = isOnboardingScreen(snapshot, context);
  for (const spec of LOCAL_COMMANDS) {
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
  if (prefixed) {
    return makeInvocation({
      sessionId,
      actionId: prefixed.id,
      executorKey: prefixed.id as VoiceInvocation["executorKey"],
      command: prefixed.command,
    });
  }

  return undefined;
}

export class LocalCommandRouter {
  public async route(
    sessionId: string,
    hypotheses: VoiceHypothesis[],
    screenSnapshot?: ScreenVoiceCapability | null,
    context?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<LocalRoutingResult> {
    const transcript = hypotheses[0]?.transcript?.trim() ?? "";
    if (!transcript) {
      return { kind: "unrecognised", reason: "no-speech" };
    }

    const pending = pendingInteractionRouter.route(
      transcript,
      normalizeVoiceText(transcript),
      context as PendingRouterContext,
    );
    if (pending) return pending;

    for (const hypothesis of hypotheses.slice(0, 5)) {
      const normalized = normalizeVoiceText(hypothesis.transcript);
      const local = matchLocalCommand(
        normalized,
        sessionId,
        screenSnapshot,
        context,
      );
      if (local) return { kind: "execute", invocation: local };
    }

    const preferences =
      (context?.preferences as VoiceResolveRequest["context"]["preferences"]) ??
      usePreferencesStore.getState();
    const resolveContext: VoiceResolveRequest["context"] = {
      screenId: screenSnapshot?.screenId ?? "unknown",
      currentPath: screenSnapshot?.routeKey ?? "/",
      pathname: screenSnapshot?.routeKey ?? "/",
      preferences,
      ...(context ?? {}),
    };

    const result = await voiceResolver.resolve({
      sessionId,
      hypotheses,
      signal,
      context: resolveContext,
    });

    if (result.kind === "invocation") {
      return { kind: "execute", invocation: result.invocation };
    }
    if (result.kind === "choices") {
      const invocations = result.choices
        .map((choice) => choice.invocation)
        .filter((item): item is VoiceInvocation => !!item);
      ambiguityController.setAmbiguity(
        sessionId,
        `${sessionId}:resolver`,
        result.choices,
        invocations,
      );
      return {
        kind: "ambiguity",
        prompt: result.prompt,
        choices: result.choices,
      };
    }
    if (result.kind === "cancelled") {
      return { kind: "cancelled" };
    }
    return { kind: "remote", transcript };
  }
}

export const localCommandRouter = new LocalCommandRouter();
