import type { ExpoSpeechRecognitionOptions } from "expo-speech-recognition";

export const PREFERRED_ANDROID_SPEECH_PACKAGES = [
  "com.google.android.googlequicksearchbox",
  "com.google.android.as",
] as const;

export const IOS_RECOGNITION_AUDIO_CATEGORY: ExpoSpeechRecognitionOptions["iosCategory"] = {
  category: "playAndRecord",
  categoryOptions: ["defaultToSpeaker", "allowBluetooth"],
  mode: "measurement",
};

export const ANDROID_SPEECH_MODEL_RETRIGGER_MS = 60_000;
