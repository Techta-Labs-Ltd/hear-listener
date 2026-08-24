import * as Speech from "expo-speech";
import { Platform } from "react-native";
import { isUkLanguage, UkSpeechService, voiceScore } from "@/services/voice/speech";

jest.mock("expo-speech", () => ({
  getAvailableVoicesAsync: jest.fn(),
  speak: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
  isSpeakingAsync: jest.fn().mockResolvedValue(false),
  VoiceQuality: {
    Default: "Default",
    Enhanced: "Enhanced",
  },
}));

describe("UkSpeechService", () => {
  let service: UkSpeechService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UkSpeechService();
  });

  describe("isUkLanguage", () => {
    it("recognizes en-GB variations as UK English", () => {
      expect(isUkLanguage("en-GB")).toBe(true);
      expect(isUkLanguage("en_GB")).toBe(true);
      expect(isUkLanguage("en-gb")).toBe(true);
      expect(isUkLanguage("en-GB-x-gbc-network")).toBe(true);
      expect(isUkLanguage("en_uk")).toBe(true);
      expect(isUkLanguage("en-UK")).toBe(true);
    });

    it("rejects non-UK languages", () => {
      expect(isUkLanguage("en-US")).toBe(false);
      expect(isUkLanguage("en-AU")).toBe(false);
      expect(isUkLanguage("fr-FR")).toBe(false);
      expect(isUkLanguage("es-ES")).toBe(false);
      expect(isUkLanguage(undefined)).toBe(false);
    });
  });

  describe("voiceScore", () => {
    it("scores enhanced and preferred UK voices higher", () => {
      const voice1: Speech.Voice = {
        identifier: "com.apple.voice.compact.en-GB.Daniel",
        name: "Daniel",
        quality: Speech.VoiceQuality.Enhanced,
        language: "en-GB",
      };
      const voice2: Speech.Voice = {
        identifier: "en-gb-x-rjs-local",
        name: "Standard UK",
        quality: Speech.VoiceQuality.Default,
        language: "en-GB",
      };
      expect(voiceScore(voice1)).toBeGreaterThan(voiceScore(voice2));
    });
  });

  describe("speak", () => {
    it("always uses en-GB language when speaking", async () => {
      (Speech.getAvailableVoicesAsync as jest.Mock).mockResolvedValue([
        {
          identifier: "com.apple.voice.compact.en-GB.Oliver",
          name: "Oliver",
          quality: Speech.VoiceQuality.Enhanced,
          language: "en-GB",
        },
        {
          identifier: "com.apple.voice.compact.en-US.Samantha",
          name: "Samantha",
          quality: Speech.VoiceQuality.Enhanced,
          language: "en-US",
        },
      ]);

      (Speech.speak as jest.Mock).mockImplementation((_text, options) => {
        options?.onDone?.();
      });

      await service.speak("Hello from Hear!");

      expect(Speech.speak).toHaveBeenCalledTimes(1);
      expect(Speech.speak).toHaveBeenCalledWith(
        "Hello from Hear!",
        expect.objectContaining({
          language: "en-GB",
          voice: "com.apple.voice.compact.en-GB.Oliver",
          rate: 0.92,
          pitch: 0.94,
        }),
      );
    });

    it("falls back to en-GB language even if voice list is empty", async () => {
      (Speech.getAvailableVoicesAsync as jest.Mock).mockResolvedValue([]);

      (Speech.speak as jest.Mock).mockImplementation((_text, options) => {
        options?.onDone?.();
      });

      await service.speak("Testing fallback");

      expect(Speech.speak).toHaveBeenCalledWith(
        "Testing fallback",
        expect.objectContaining({
          language: "en-GB",
          voice: undefined,
        }),
      );
    });

    it("lets Android initialize itself and select an installed English voice", async () => {
      const platform = jest.replaceProperty(Platform, "OS", "android");
      (Speech.speak as jest.Mock).mockImplementation((_text, options) => {
        options?.onDone?.();
      });

      await service.speak("Android speech fallback");

      expect(Speech.getAvailableVoicesAsync).not.toHaveBeenCalled();
      expect(Speech.speak).toHaveBeenCalledWith(
        "Android speech fallback",
        expect.objectContaining({ language: "en-GB", voice: undefined }),
      );
      platform.restore();
    });

    it("does not block voice recognition when Android TTS never starts", async () => {
      jest.useFakeTimers();
      const platform = jest.replaceProperty(Platform, "OS", "android");
      (Speech.speak as jest.Mock).mockImplementation(() => undefined);

      const promise = service.speak("This engine is unavailable");
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(8000);

      await expect(promise).resolves.toBe("TIMEOUT");
      platform.restore();
      jest.useRealTimers();
    });

    it("skips sensitive or empty messages", async () => {
      await service.speak("", { sensitive: false });
      await service.speak("Secret code", { sensitive: true });
      expect(Speech.speak).not.toHaveBeenCalled();
    });
  });
});
