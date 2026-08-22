import { Platform } from "react-native";
import * as Speech from "expo-speech";

const preferredUkNames = [
  "daniel",
  "arthur",
  "oliver",
  "george",
  "serena",
  "stephanie",
  "hazel",
  "martha",
  "ryan",
  "male",
  "en-gb",
];

export function isUkLanguage(language?: string): boolean {
  if (!language) return false;
  const normalized = language.toLowerCase().replace(/_/g, "-");
  return (
    normalized === "en-gb" ||
    normalized.startsWith("en-gb-") ||
    normalized === "en-uk" ||
    normalized.startsWith("en-uk-")
  );
}

export function voiceScore(voice: Speech.Voice): number {
  const identity = `${voice.name} ${voice.identifier}`.toLowerCase();
  const preferredIndex = preferredUkNames.findIndex((name) =>
    identity.includes(name),
  );
  return (
    (voice.quality === "Enhanced" ? 100 : 0) +
    (identity.includes("network") || identity.includes("premium") ? 40 : 0) +
    (preferredIndex >= 0 ? 80 - preferredIndex : 0)
  );
}

export class UkSpeechService {
  private voicePromise?: Promise<string | undefined>;
  private interrupted = false;

  private async getUkVoiceIdentifier(): Promise<string | undefined> {
    if (this.voicePromise) return this.voicePromise;

    this.voicePromise = Speech.getAvailableVoicesAsync()
      .then((voices) => {
        if (!Array.isArray(voices) || voices.length === 0) return undefined;
        const ukVoices = voices.filter((v) => isUkLanguage(v.language));
        if (ukVoices.length === 0) return undefined;

        ukVoices.sort(
          (left, right) =>
            voiceScore(right) - voiceScore(left) ||
            left.name.localeCompare(right.name),
        );
        return ukVoices[0]?.identifier;
      })
      .catch(() => undefined);

    return this.voicePromise;
  }

  async speak(
    text: string,
    options: {
      interrupt?: boolean;
      pitch?: number;
      rate?: number;
      sensitive?: boolean;
    } = {},
  ): Promise<"DONE" | "INTERRUPTED" | "ERROR" | "TIMEOUT"> {
    if (!text || options.sensitive) return "DONE";
    this.interrupted = false;
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      window.speechSynthesis
    ) {
      window.speechSynthesis.resume();
    }
    try {
      if (options.interrupt !== false) {
        await Speech.stop();
        if (
          Platform.OS === "web" &&
          typeof window !== "undefined" &&
          window.speechSynthesis
        ) {
          window.speechSynthesis.resume();
        }
      }
      const voice = await this.getUkVoiceIdentifier();
      const succeeded = await new Promise<"DONE" | "INTERRUPTED" | "ERROR" | "TIMEOUT">((resolve) => {
        let settled = false;
        let timeout: ReturnType<typeof setTimeout> | undefined;

        const complete = (result: "DONE" | "INTERRUPTED" | "ERROR" | "TIMEOUT") => {
          if (settled) return;
          settled = true;
          if (timeout) clearTimeout(timeout);
          resolve(result);
        };

        const timeoutMs = Math.max(16000, Math.ceil(text.length * 130));
        timeout = setTimeout(() => complete("TIMEOUT"), timeoutMs);

        Speech.speak(text, {
          language: "en-GB",
          voice,
          rate: options.rate ?? 0.92,
          pitch: options.pitch ?? 0.94,
          useApplicationAudioSession: false,
          onDone: () => complete("DONE"),
          onStopped: () => {
            this.interrupted = true;
            complete("INTERRUPTED");
          },
          onError: () => {
            this.resetVoiceCache();
            complete("ERROR");
          },
        });
      });
      if (succeeded === "ERROR" || succeeded === "TIMEOUT") {
        await this.speakWithDefaults(text, options);
        return "ERROR";
      }
      return succeeded;
    } catch {
      this.resetVoiceCache();
      await this.speakWithDefaults(text, options);
      return "ERROR";
    }
  }

  private speakWithDefaults(
    text: string,
    options: {
      pitch?: number;
      rate?: number;
    },
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      let settled = false;
      let timeout: ReturnType<typeof setTimeout> | undefined;

      const complete = () => {
        if (settled) return;
        settled = true;
        if (timeout) clearTimeout(timeout);
        resolve();
      };

      const timeoutMs = Math.max(16000, Math.ceil(text.length * 130));
      timeout = setTimeout(complete, timeoutMs);

      Speech.speak(text, {
        language: "en-GB",
        rate: options.rate ?? 0.92,
        pitch: options.pitch ?? 0.94,
        onDone: complete,
        onStopped: complete,
        onError: complete,
      });
    });
  }

  stop(): Promise<void> {
    return Speech.stop();
  }

  isSpeakingAsync(): Promise<boolean> {
    return Speech.isSpeakingAsync();
  }

  resetVoiceCache(): void {
    this.voicePromise = undefined;
  }
}

export const ukSpeech = new UkSpeechService();
