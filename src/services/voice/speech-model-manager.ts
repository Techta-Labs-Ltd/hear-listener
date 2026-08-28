import { Platform } from "react-native";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import type {
  AndroidSpeechModelState,
  PlatformSpeechCapabilities,
} from "@/types";
import { UK_ASR_LOCALE } from "./speech-recognition-bootstrap";
import { ANDROID_SPEECH_MODEL_RETRIGGER_MS } from "@/constants/voice-recognition";

function isEnGb(locale: string): boolean {
  return locale.toLowerCase().startsWith("en-gb");
}

class SpeechModelManager {
  private lastTriggeredAt = 0;

  async checkEnGbModel(
    capabilities: PlatformSpeechCapabilities,
  ): Promise<AndroidSpeechModelState> {
    if (capabilities.platform !== "android") return "unsupported";
    if ((capabilities.apiLevel ?? 0) < 33) return "unsupported";
    try {
      const result = await ExpoSpeechRecognitionModule.getSupportedLocales({
        androidRecognitionServicePackage: capabilities.selectedService,
      });
      if (result.installedLocales.some(isEnGb)) return "installed";
      if (result.locales.some(isEnGb)) return "missing";
      return "unsupported";
    } catch {
      return "error";
    }
  }

  async requestEnGbModelDownload(
    capabilities: PlatformSpeechCapabilities,
  ): Promise<AndroidSpeechModelState> {
    if (capabilities.platform !== "android") return "unsupported";
    if ((capabilities.apiLevel ?? 0) < 33) return "unsupported";
    const now = Date.now();
    if (
      now - this.lastTriggeredAt <
      ANDROID_SPEECH_MODEL_RETRIGGER_MS
    ) {
      const current = await this.checkEnGbModel(capabilities);
      return current === "installed" ? "installed" : "download-scheduled";
    }
    this.lastTriggeredAt = now;
    try {
      const result =
        await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
          locale: UK_ASR_LOCALE,
        });
      switch (result.status) {
        case "opened_dialog":
          return "download-requested";
        case "download_success": {
          const rechecked = await this.checkEnGbModel(capabilities);
          return rechecked === "installed" ? "installed" : "download-requested";
        }
        case "download_scheduled":
          return "download-scheduled";
      }
    } catch {
      return "error";
    }
  }
}

export const speechModelManager = new SpeechModelManager();

export function supportsAndroidModelManagement(): boolean {
  return Platform.OS === "android" && Number(Platform.Version) >= 33;
}

export function modelStateNeedsRecheck(state: AndroidSpeechModelState): boolean {
  return state === "download-requested" || state === "download-scheduled";
}
