import { Platform } from "react-native";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import {
  detectPlatformSpeechCapabilities,
  ensureVoicePermissions,
} from "@/services/voice/speech-recognition-bootstrap";

jest.mock("expo-speech-recognition", () => ({
  ExpoSpeechRecognitionModule: {
    isRecognitionAvailable: jest.fn(() => true),
    supportsOnDeviceRecognition: jest.fn(() => false),
    getSpeechRecognitionServices: jest.fn(() => []),
    getDefaultRecognitionService: jest.fn(() => ({ packageName: "" })),
    getMicrophonePermissionsAsync: jest.fn(),
    requestMicrophonePermissionsAsync: jest.fn(),
    getSpeechRecognizerPermissionsAsync: jest.fn(),
    requestSpeechRecognizerPermissionsAsync: jest.fn(),
  },
}));

function mockExpo(): Record<string, jest.Mock> {
  return ExpoSpeechRecognitionModule as unknown as Record<string, jest.Mock>;
}

const grantedMic = { granted: true, status: "granted", canAskAgain: true };

describe("speech recognition bootstrap", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("grants Android with microphone-only permission", async () => {
    (Platform as { OS: string }).OS = "android";
    mockExpo().getMicrophonePermissionsAsync.mockResolvedValue(grantedMic);
    const capabilities = detectPlatformSpeechCapabilities();
    const result = await ensureVoicePermissions(capabilities, false);
    expect(result.ok).toBe(true);
    expect(result.permissionState.microphone).toBe("granted");
    expect(result.permissionState.speechRecognition).toBe("not-required");
  });

  it("requests Android microphone permission when not yet granted", async () => {
    (Platform as { OS: string }).OS = "android";
    const expo = mockExpo();
    expo.getMicrophonePermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
    });
    expo.requestMicrophonePermissionsAsync.mockResolvedValue(grantedMic);
    const result = await ensureVoicePermissions(
      detectPlatformSpeechCapabilities(),
      false,
    );
    expect(result.ok).toBe(true);
    expect(expo.requestMicrophonePermissionsAsync).toHaveBeenCalled();
  });

  it("fails Android with microphone-denied when permission is refused", async () => {
    (Platform as { OS: string }).OS = "android";
    const expo = mockExpo();
    expo.getMicrophonePermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
    });
    expo.requestMicrophonePermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
    });
    const result = await ensureVoicePermissions(
      detectPlatformSpeechCapabilities(),
      false,
    );
    expect(result.ok).toBe(false);
    expect(result.failureReason).toBe("microphone-denied");
  });

  it("grants iOS with microphone + speech permission for network recognition", async () => {
    (Platform as { OS: string }).OS = "ios";
    const expo = mockExpo();
    expo.getMicrophonePermissionsAsync.mockResolvedValue(grantedMic);
    expo.getSpeechRecognizerPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: true,
    });
    const result = await ensureVoicePermissions(
      detectPlatformSpeechCapabilities(),
      false,
    );
    expect(result.ok).toBe(true);
    expect(result.permissionState.speechRecognition).toBe("granted");
  });

  it("uses microphone-only for explicit on-device iOS recognition", async () => {
    (Platform as { OS: string }).OS = "ios";
    const expo = mockExpo();
    expo.getMicrophonePermissionsAsync.mockResolvedValue(grantedMic);
    const result = await ensureVoicePermissions(
      detectPlatformSpeechCapabilities(),
      true,
    );
    expect(result.ok).toBe(true);
    expect(result.permissionState.speechRecognition).toBe("not-required");
    expect(expo.getSpeechRecognizerPermissionsAsync).not.toHaveBeenCalled();
  });

  it("falls back to on-device when iOS speech permission is restricted and supported", async () => {
    (Platform as { OS: string }).OS = "ios";
    const expo = mockExpo();
    expo.supportsOnDeviceRecognition.mockReturnValue(true);
    expo.getMicrophonePermissionsAsync.mockResolvedValue(grantedMic);
    expo.getSpeechRecognizerPermissionsAsync.mockResolvedValue({
      granted: false,
      restricted: true,
      canAskAgain: false,
    });
    const capabilities = detectPlatformSpeechCapabilities();
    const result = await ensureVoicePermissions(capabilities, false);
    expect(result.ok).toBe(true);
    expect(result.onDeviceFallback).toBe(true);
    expect(result.permissionState.speechRecognition).toBe("restricted");
  });

  it("fails iOS with speech-denied when denied and no on-device support", async () => {
    (Platform as { OS: string }).OS = "ios";
    const expo = mockExpo();
    expo.supportsOnDeviceRecognition.mockReturnValue(false);
    expo.getMicrophonePermissionsAsync.mockResolvedValue(grantedMic);
    expo.getSpeechRecognizerPermissionsAsync.mockResolvedValue({
      granted: false,
      restricted: false,
      canAskAgain: false,
    });
    expo.requestSpeechRecognizerPermissionsAsync.mockResolvedValue({
      granted: false,
      restricted: false,
      canAskAgain: false,
    });
    const result = await ensureVoicePermissions(
      detectPlatformSpeechCapabilities(),
      false,
    );
    expect(result.ok).toBe(false);
    expect(result.failureReason).toBe("speech-denied");
  });
});