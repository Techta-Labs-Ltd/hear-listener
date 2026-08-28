import { Platform } from "react-native";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import {
  checkMicrophonePermissionStatus,
  requestMicrophonePermissionSafely,
} from "@/services/voice/microphone-permission-service";

jest.mock("expo-speech-recognition", () => ({
  ExpoSpeechRecognitionModule: {
    getMicrophonePermissionsAsync: jest.fn(),
    requestMicrophonePermissionsAsync: jest.fn(),
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
  },
}));

function mockExpo(): Record<string, jest.Mock> {
  return ExpoSpeechRecognitionModule as unknown as Record<string, jest.Mock>;
}

describe("onboarding microphone permission", () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    (Platform as { OS: string }).OS = "ios";
  });

  afterEach(() => {
    (Platform as { OS: string }).OS = originalPlatform;
    jest.clearAllMocks();
  });

  it("does not mark microphone access off because Speech Recognition is denied", async () => {
    const expo = mockExpo();
    expo.getMicrophonePermissionsAsync.mockResolvedValue({
      granted: true,
      status: "granted",
      canAskAgain: true,
    });
    expo.getPermissionsAsync.mockResolvedValue({
      granted: false,
      status: "denied",
      canAskAgain: false,
    });

    await expect(checkMicrophonePermissionStatus()).resolves.toMatchObject({
      granted: true,
      status: "granted",
    });
    expect(expo.getPermissionsAsync).not.toHaveBeenCalled();
  });

  it("requests only microphone access during onboarding", async () => {
    const expo = mockExpo();
    expo.getMicrophonePermissionsAsync.mockResolvedValue({
      granted: false,
      status: "undetermined",
      canAskAgain: true,
    });
    expo.requestMicrophonePermissionsAsync.mockResolvedValue({
      granted: true,
      status: "granted",
      canAskAgain: true,
    });

    await expect(requestMicrophonePermissionSafely()).resolves.toMatchObject({
      granted: true,
      status: "granted",
      undetermined: true,
    });
    expect(expo.requestMicrophonePermissionsAsync).toHaveBeenCalledTimes(1);
    expect(expo.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});
