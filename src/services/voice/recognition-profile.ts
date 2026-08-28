import { Platform } from "react-native";
import type {
  PlatformSpeechCapabilities,
  RecognitionPurpose,
} from "@/types";
import type { ExpoSpeechRecognitionOptions } from "expo-speech-recognition";
import { VOICE_LANGUAGE, VOICE_MAX_ALTERNATIVES } from "@/constants/voice";
import {
  IOS_RECOGNITION_AUDIO_CATEGORY,
  PREFERRED_ANDROID_SPEECH_PACKAGES,
} from "@/constants/voice-recognition";

function androidApiLevel(): number {
  return typeof Platform.Version === "number"
    ? Platform.Version
    : Number.parseInt(String(Platform.Version), 10) || 0;
}

function languageModelFor(purpose: RecognitionPurpose): "free_form" | "web_search" {
  switch (purpose) {
    case "entity-search":
    case "short-response":
      return "web_search";
    case "command":
    case "dictation":
      return "free_form";
  }
}

function iosTaskHintFor(
  purpose: RecognitionPurpose,
): "search" | "confirmation" | "dictation" | "unspecified" {
  switch (purpose) {
    case "command":
    case "entity-search":
      return "search";
    case "short-response":
      return "confirmation";
    case "dictation":
      return "dictation";
  }
}

export function pickAndroidRecognitionService(
  capabilities: PlatformSpeechCapabilities,
): string | undefined {
  const available = new Set(capabilities.services);
  const preferred = PREFERRED_ANDROID_SPEECH_PACKAGES.find((pkg) =>
    available.has(pkg),
  );
  return preferred ?? capabilities.defaultService ?? undefined;
}

export function buildRecognitionOptions(
  purpose: RecognitionPurpose,
  contextualStrings: string[],
  capabilities: PlatformSpeechCapabilities,
): ExpoSpeechRecognitionOptions {
  const common: ExpoSpeechRecognitionOptions = {
    lang: VOICE_LANGUAGE,
    interimResults: true,
    maxAlternatives: VOICE_MAX_ALTERNATIVES,
    continuous: capabilities.platform === "android",
    requiresOnDeviceRecognition: false,
    addsPunctuation: false,
    contextualStrings,
  };

  if (capabilities.platform === "android") {
    const androidIntentOptions: NonNullable<
      ExpoSpeechRecognitionOptions["androidIntentOptions"]
    > = {
      EXTRA_LANGUAGE_MODEL: languageModelFor(purpose),
    };
    const apiLevel = capabilities.apiLevel ?? androidApiLevel();
    if (apiLevel >= 33) {
      androidIntentOptions.EXTRA_MASK_OFFENSIVE_WORDS = true;
    }
    const selected = pickAndroidRecognitionService(capabilities);
    return {
      ...common,
      androidIntentOptions,
      ...(selected ? { androidRecognitionServicePackage: selected } : {}),
    };
  }

  return {
    ...common,
    iosTaskHint: iosTaskHintFor(purpose),
    iosCategory: IOS_RECOGNITION_AUDIO_CATEGORY,
    iosVoiceProcessingEnabled: false,
  };
}

export function resolveRecognitionPurpose(input: {
  expectation?: "natural-command" | "entity-search" | "short-response";
  clarifying?: boolean;
  pendingAmbiguity?: boolean;
  pendingFeedback?: boolean;
}): RecognitionPurpose {
  if (input.expectation === "entity-search") return "entity-search";
  if (input.expectation === "short-response") return "short-response";
  if (input.clarifying || input.pendingAmbiguity || input.pendingFeedback) {
    return "short-response";
  }
  return "command";
}
