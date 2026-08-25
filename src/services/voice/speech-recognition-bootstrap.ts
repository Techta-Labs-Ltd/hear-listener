import { Platform } from "react-native";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import type {
  PlatformSpeechCapabilities,
  SpeechBootstrapResult,
  SpeechPermissionFailure,
  VoicePermissionState,
} from "@/types";
import { pickAndroidRecognitionService } from "./recognition-profile";

export const UK_ASR_LOCALE = "en-GB";

export function detectPlatformSpeechCapabilities(): PlatformSpeechCapabilities {
  try {
    if (Platform.OS === "android") {
      const services = ExpoSpeechRecognitionModule.getSpeechRecognitionServices();
      const defaultService =
        ExpoSpeechRecognitionModule.getDefaultRecognitionService();
      const base: PlatformSpeechCapabilities = {
        platform: "android",
        recognitionAvailable:
          ExpoSpeechRecognitionModule.isRecognitionAvailable(),
        onDeviceSupported:
          ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
        services,
        defaultService: defaultService?.packageName ?? "",
        apiLevel:
          typeof Platform.Version === "number"
            ? Platform.Version
            : Number.parseInt(String(Platform.Version), 10) || undefined,
      };
      base.selectedService = pickAndroidRecognitionService(base);
      return base;
    }
    if (Platform.OS === "ios") {
      return {
        platform: "ios",
        recognitionAvailable:
          ExpoSpeechRecognitionModule.isRecognitionAvailable(),
        onDeviceSupported:
          ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
        services: [],
        defaultService: "",
      };
    }
  } catch {
    // fall through to the unavailable shape below
  }
  return {
    platform: Platform.OS === "web" ? "web" : "unknown",
    recognitionAvailable: false,
    onDeviceSupported: false,
    services: [],
    defaultService: "",
  };
}

function unknownPermissionState(
  onDeviceOnly: boolean,
): VoicePermissionState {
  return {
    microphone: "unknown",
    speechRecognition: onDeviceOnly ? "not-required" : "unknown",
  };
}

async function ensureAndroidPermissions(
  capabilities: PlatformSpeechCapabilities,
  onDeviceOnly: boolean,
): Promise<{
  ok: boolean;
  permissionState: VoicePermissionState;
  failureReason?: SpeechPermissionFailure;
  onDeviceFallback: boolean;
}> {
  const state: VoicePermissionState = {
    microphone: "unknown",
    speechRecognition: "not-required",
  };
  const current = await ExpoSpeechRecognitionModule.getMicrophonePermissionsAsync();
  if (current.granted) {
    state.microphone = "granted";
  } else {
    const requested =
      await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
    if (!requested.granted) {
      return {
        ok: false,
        permissionState: {
          ...state,
          microphone: "denied",
          canAskMicrophoneAgain: requested.canAskAgain,
        },
        failureReason: "microphone-denied",
        onDeviceFallback: false,
      };
    }
    state.microphone = "granted";
    state.canAskMicrophoneAgain = requested.canAskAgain;
  }
  return { ok: true, permissionState: state, onDeviceFallback: false };
}

async function ensureIosPermissions(
  capabilities: PlatformSpeechCapabilities,
  onDeviceOnly: boolean,
): Promise<{
  ok: boolean;
  permissionState: VoicePermissionState;
  failureReason?: SpeechPermissionFailure;
  onDeviceFallback: boolean;
}> {
  const state = unknownPermissionState(onDeviceOnly);
  const currentMic =
    await ExpoSpeechRecognitionModule.getMicrophonePermissionsAsync();
  if (!currentMic.granted) {
    const requested =
      await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
    if (!requested.granted) {
      return {
        ok: false,
        permissionState: {
          ...state,
          microphone: "denied",
          canAskMicrophoneAgain: requested.canAskAgain,
        },
        failureReason: "microphone-denied",
        onDeviceFallback: false,
      };
    }
  }
  state.microphone = "granted";

  if (onDeviceOnly) {
    state.speechRecognition = "not-required";
    return { ok: true, permissionState: state, onDeviceFallback: false };
  }

  const currentSpeech =
    await ExpoSpeechRecognitionModule.getSpeechRecognizerPermissionsAsync();
  if (currentSpeech.granted) {
    state.speechRecognition = "granted";
    state.canAskSpeechAgain = currentSpeech.canAskAgain;
    return { ok: true, permissionState: state, onDeviceFallback: false };
  }

  const onDeviceFallback = capabilities.onDeviceSupported;
  if (currentSpeech.restricted) {
    if (onDeviceFallback) {
      state.speechRecognition = "restricted";
      state.canAskSpeechAgain = currentSpeech.canAskAgain;
      return { ok: true, permissionState: state, onDeviceFallback: true };
    }
    return {
      ok: false,
      permissionState: { ...state, speechRecognition: "restricted" },
      failureReason: "speech-restricted",
      onDeviceFallback: false,
    };
  }

  const requested =
    await ExpoSpeechRecognitionModule.requestSpeechRecognizerPermissionsAsync();
  if (!requested.granted) {
    if (requested.restricted && onDeviceFallback) {
      state.speechRecognition = "restricted";
      state.canAskSpeechAgain = requested.canAskAgain;
      return { ok: true, permissionState: state, onDeviceFallback: true };
    }
    if (onDeviceFallback) {
      state.speechRecognition = "denied";
      state.canAskSpeechAgain = requested.canAskAgain;
      return { ok: true, permissionState: state, onDeviceFallback: true };
    }
    return {
      ok: false,
      permissionState: {
        ...state,
        speechRecognition: requested.restricted ? "restricted" : "denied",
        canAskSpeechAgain: requested.canAskAgain,
      },
      failureReason: requested.restricted ? "speech-restricted" : "speech-denied",
      onDeviceFallback: false,
    };
  }
  state.speechRecognition = "granted";
  state.canAskSpeechAgain = requested.canAskAgain;
  return { ok: true, permissionState: state, onDeviceFallback: false };
}

export async function ensureVoicePermissions(
  capabilities: PlatformSpeechCapabilities,
  requiresOnDeviceRecognition: boolean,
): Promise<{
  ok: boolean;
  permissionState: VoicePermissionState;
  failureReason?: SpeechPermissionFailure;
  onDeviceFallback: boolean;
}> {
  if (capabilities.platform === "android") {
    return ensureAndroidPermissions(capabilities, requiresOnDeviceRecognition);
  }
  if (capabilities.platform === "ios") {
    return ensureIosPermissions(capabilities, requiresOnDeviceRecognition);
  }
  return {
    ok: false,
    permissionState: {
      microphone: "unknown",
      speechRecognition: requiresOnDeviceRecognition ? "not-required" : "unknown",
    },
    failureReason: "microphone-denied",
    onDeviceFallback: false,
  };
}

export async function resolveSpeechBootstrap(
  requiresOnDeviceRecognition = false,
): Promise<SpeechBootstrapResult> {
  const capabilities = detectPlatformSpeechCapabilities();
  if (!capabilities.recognitionAvailable) {
    return {
      ready: false,
      permissionState: {
        microphone: "unknown",
        speechRecognition: requiresOnDeviceRecognition
          ? "not-required"
          : "unknown",
      },
      capabilities,
      onDeviceFallback: false,
      failureReason: "recognition-unavailable",
    };
  }
  const permission = await ensureVoicePermissions(
    capabilities,
    requiresOnDeviceRecognition && capabilities.onDeviceSupported,
  );
  return {
    ready: permission.ok,
    permissionState: permission.permissionState,
    capabilities,
    onDeviceFallback: permission.onDeviceFallback,
    failureReason: permission.failureReason,
  };
}
