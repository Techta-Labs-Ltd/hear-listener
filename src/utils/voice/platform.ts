import { Platform } from "react-native";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import {
  VOICE_LANGUAGE,
  VOICE_MAX_ALTERNATIVES,
  VOICE_TIMING,
} from "@/constants/voice";

export async function isSpeechRecognitionSupported(): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      return (
        (typeof window !== "undefined" &&
          ("SpeechRecognition" in window ||
            "webkitSpeechRecognition" in window)) ||
        Boolean(ExpoSpeechRecognitionModule?.isRecognitionAvailable?.())
      );
    }
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}

export function supportsOnDeviceSpeechRecognition(): boolean {
  try {
    if (Platform.OS === "web") return false;
    return ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
  } catch {
    return false;
  }
}

import type { MicrophonePermissionStatus } from "@/types";

export type { MicrophonePermissionStatus };

export async function checkMicrophonePermissionStatus(): Promise<MicrophonePermissionStatus> {
  if (Platform.OS === "web") {
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      try {
        const permissionStatus = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        if (permissionStatus.state === "granted") {
          return { granted: true, status: "granted", canAskAgain: true };
        }
        if (permissionStatus.state === "denied") {
          return { granted: false, status: "blocked", canAskAgain: false };
        }
        return { granted: false, status: "undetermined", canAskAgain: true };
      } catch {}
    }
    return { granted: false, status: "undetermined", canAskAgain: true };
  }

  try {
    const perm = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (!perm) return { granted: false, status: "undetermined", canAskAgain: true };
    const granted = Boolean(perm.granted);
    let status: "granted" | "denied" | "undetermined" | "blocked" =
      perm.status === "granted"
        ? "granted"
        : perm.status === "undetermined"
          ? "undetermined"
          : perm.canAskAgain === false
            ? "blocked"
            : "denied";
    return {
      granted,
      status,
      canAskAgain: perm.canAskAgain !== false,
    };
  } catch {
    return { granted: false, status: "denied", canAskAgain: true };
  }
}

export async function requestMicrophonePermissionSafely(): Promise<{
  granted: boolean;
  status: "granted" | "denied" | "undetermined" | "blocked";
  undetermined?: boolean;
}> {
  if (Platform.OS === "web") {
    if (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices?.getUserMedia
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        return { granted: true, status: "granted" };
      } catch (err: any) {
        const isBlocked =
          err?.name === "NotAllowedError" ||
          err?.name === "PermissionDeniedError";
        return {
          granted: false,
          status: isBlocked ? "blocked" : "denied",
        };
      }
    }
    return { granted: false, status: "denied" };
  }

  try {
    const existing = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    const isUndetermined = existing?.status === "undetermined";

    const requested =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    const granted = Boolean(requested?.granted);
    const status: "granted" | "denied" | "undetermined" | "blocked" = granted
      ? "granted"
      : requested?.canAskAgain === false
        ? "blocked"
        : "denied";
    return {
      granted,
      status,
      undetermined: isUndetermined,
    };
  } catch {
    return { granted: false, status: "denied" };
  }
}

export function buildSpeechRecognitionOptions(params: {
  onDevice: boolean;
  contextualStrings: string[];
}) {
  const isIos = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";

  return {
    lang: VOICE_LANGUAGE,
    interimResults: true,
    continuous: true,
    maxAlternatives: VOICE_MAX_ALTERNATIVES,
    contextualStrings: params.contextualStrings,
    requiresOnDeviceRecognition: params.onDevice,
    addsPunctuation: false,
    iosTaskHint: "dictation" as const,
    iosVoiceProcessingEnabled: true,
    iosCategory: isIos
      ? {
          category: "playAndRecord" as const,
          categoryOptions: ["defaultToSpeaker", "allowBluetooth"] as (
            | "defaultToSpeaker"
            | "allowBluetooth"
          )[],
          mode: "voiceChat" as const,
        }
      : undefined,
    androidIntentOptions: isAndroid
      ? {
          EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS:
            VOICE_TIMING.androidMinSpeechInputMs,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS:
            VOICE_TIMING.androidPossibleSilenceMs,
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS:
            VOICE_TIMING.androidCompleteSilenceMs,
        }
      : undefined,
  };
}
