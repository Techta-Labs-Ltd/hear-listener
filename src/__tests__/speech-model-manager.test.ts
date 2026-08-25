import { Platform } from "react-native";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import {
  modelStateNeedsRecheck,
  speechModelManager,
  supportsAndroidModelManagement,
} from "@/services/voice/speech-model-manager";
import type { PlatformSpeechCapabilities } from "@/types";

jest.mock("expo-speech-recognition", () => ({
  ExpoSpeechRecognitionModule: {
    getSupportedLocales: jest.fn(),
    androidTriggerOfflineModelDownload: jest.fn(),
  },
}));

const capabilities: PlatformSpeechCapabilities = {
  platform: "android",
  recognitionAvailable: true,
  onDeviceSupported: true,
  services: ["com.google.android.as"],
  defaultService: "com.google.android.as",
  selectedService: "com.google.android.as",
  apiLevel: 34,
};

function mockExpo(): Record<string, jest.Mock> {
  return ExpoSpeechRecognitionModule as unknown as Record<string, jest.Mock>;
}

describe("speech model manager", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("reports unsupported on non-Android or below API 33", async () => {
    expect(supportsAndroidModelManagement()).toBe(false);
    expect(
      await speechModelManager.checkEnGbModel({ ...capabilities, platform: "ios" }),
    ).toBe("unsupported");
    expect(
      await speechModelManager.checkEnGbModel({ ...capabilities, apiLevel: 31 }),
    ).toBe("unsupported");
  });

  it("reports installed when en-GB is in the installed locales", async () => {
    (Platform as { OS: string }).OS = "android";
    mockExpo().getSupportedLocales.mockResolvedValue({
      locales: ["en-US", "en-GB"],
      installedLocales: ["en-US", "en-GB"],
    });
    expect(await speechModelManager.checkEnGbModel(capabilities)).toBe(
      "installed",
    );
  });

  it("reports missing when en-GB is supported but not installed", async () => {
    (Platform as { OS: string }).OS = "android";
    mockExpo().getSupportedLocales.mockResolvedValue({
      locales: ["en-US", "en-GB"],
      installedLocales: ["en-US"],
    });
    expect(await speechModelManager.checkEnGbModel(capabilities)).toBe(
      "missing",
    );
  });

  it("maps download results to model states and re-checks on success", async () => {
    (Platform as { OS: string }).OS = "android";
    const expo = mockExpo();
    expo.getSupportedLocales.mockResolvedValue({
      locales: ["en-GB"],
      installedLocales: [],
    });
    expo.androidTriggerOfflineModelDownload.mockResolvedValue({
      status: "opened_dialog",
      message: "dialog",
    });
    expect(
      await speechModelManager.requestEnGbModelDownload(capabilities),
    ).toBe("download-requested");

    expo.androidTriggerOfflineModelDownload.mockResolvedValue({
      status: "download_scheduled",
      message: "queued",
    });
    expect(
      await speechModelManager.requestEnGbModelDownload(capabilities),
    ).toBe("download-scheduled");

    expo.getSupportedLocales.mockResolvedValue({
      locales: ["en-GB"],
      installedLocales: ["en-GB"],
    });
    expo.androidTriggerOfflineModelDownload.mockResolvedValue({
      status: "download_success",
      message: "ok",
    });
    expect(
      await speechModelManager.requestEnGbModelDownload(capabilities),
    ).toBe("installed");
  });

  it("flags states that need an app-foreground recheck", () => {
    expect(modelStateNeedsRecheck("download-requested")).toBe(true);
    expect(modelStateNeedsRecheck("download-scheduled")).toBe(true);
    expect(modelStateNeedsRecheck("installed")).toBe(false);
  });
});