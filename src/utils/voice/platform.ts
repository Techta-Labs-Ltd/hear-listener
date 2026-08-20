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

export async function requestMicrophonePermissionSafely(): Promise<{
  granted: boolean;
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
        return { granted: true };
      } catch {
        return { granted: false };
      }
    }
    return { granted: true };
  }

  try {
    const existing = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    const isUndetermined = existing?.status === "undetermined";

    const requested =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return {
      granted: Boolean(requested?.granted),
      undetermined: isUndetermined,
    };
  } catch {
    return { granted: false };
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
    continuous: false,
    maxAlternatives: VOICE_MAX_ALTERNATIVES,
    contextualStrings: params.contextualStrings,
    requiresOnDeviceRecognition: isAndroid
      ? params.onDevice
      : isIos
        ? true
        : false,
    addsPunctuation: false,
    iosTaskHint: "confirmation" as const,
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
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS:
            VOICE_TIMING.androidSilenceLengthMs,
        }
      : undefined,
  };
}
