import { Platform } from "react-native";
import * as Speech from "expo-speech";
import { useSpeechStore } from "@/stores/speech-store";
import { isUkLanguage, voiceScore } from "@/utils/voice/speech";

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
        useSpeechStore.getState().setSpeaking(false, null);
        if (
          Platform.OS === "web" &&
          typeof window !== "undefined" &&
          window.speechSynthesis
        ) {
          window.speechSynthesis.resume();
        }
      }
      const voice =
        Platform.OS === "android"
          ? undefined
          : await this.getUkVoiceIdentifier();
      const language = Platform.OS === "android" ? "en-GB" : "en-GB";
      const succeeded = await new Promise<"DONE" | "INTERRUPTED" | "ERROR" | "TIMEOUT">((resolve) => {
        let settled = false;
        let startTimeout: ReturnType<typeof setTimeout> | undefined;
        let completionTimeout: ReturnType<typeof setTimeout> | undefined;

        const complete = (result: "DONE" | "INTERRUPTED" | "ERROR" | "TIMEOUT") => {
          if (settled) return;
          settled = true;
          if (startTimeout) clearTimeout(startTimeout);
          if (completionTimeout) clearTimeout(completionTimeout);
          useSpeechStore.getState().setSpeaking(false, null);
          resolve(result);
        };

        startTimeout = setTimeout(() => complete("TIMEOUT"), 8000);
        const completionTimeoutMs = Math.max(12000, Math.ceil(text.length * 140));
        completionTimeout = setTimeout(
          () => complete("DONE"),
          completionTimeoutMs,
        );

        useSpeechStore.getState().setSpeaking(true, text);

        Speech.speak(text, {
          language,
          voice,
          rate: options.rate ?? 0.92,
          pitch: options.pitch ?? 0.94,
          useApplicationAudioSession: false,
          onStart: () => {
            if (startTimeout) clearTimeout(startTimeout);
            useSpeechStore.getState().setSpeaking(true, text);
          },
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
      if (succeeded === "ERROR") {
        await this.speakWithDefaults(text, options);
        return "DONE";
      }
      return succeeded;
    } catch {
      this.resetVoiceCache();
      await this.speakWithDefaults(text, options);
      return "DONE";
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
      let startTimeout: ReturnType<typeof setTimeout> | undefined;
      let completionTimeout: ReturnType<typeof setTimeout> | undefined;

      const complete = () => {
        if (settled) return;
        settled = true;
        if (startTimeout) clearTimeout(startTimeout);
        if (completionTimeout) clearTimeout(completionTimeout);
        resolve();
      };

      startTimeout = setTimeout(complete, 8000);
      completionTimeout = setTimeout(
        complete,
        Math.max(12000, Math.ceil(text.length * 140)),
      );

      Speech.speak(text, {
        language: "en",
        rate: options.rate ?? 0.92,
        pitch: options.pitch ?? 0.94,
        onStart: () => {
          if (startTimeout) clearTimeout(startTimeout);
        },
        onDone: complete,
        onStopped: complete,
        onError: complete,
      });
    });
  }

  async stop(): Promise<void> {
    try {
      useSpeechStore.getState().setSpeaking(false, null);
      await Promise.race([
        Speech.stop(),
        new Promise<void>((resolve) => setTimeout(resolve, 500)),
      ]);
    } catch {
      this.resetVoiceCache();
    } finally {
      useSpeechStore.getState().setSpeaking(false, null);
    }
  }

  async isSpeakingAsync(): Promise<boolean> {
    try {
      return await Promise.race([
        Speech.isSpeakingAsync(),
        new Promise<false>((resolve) => setTimeout(() => resolve(false), 500)),
      ]);
    } catch {
      return false;
    }
  }

  resetVoiceCache(): void {
    this.voicePromise = undefined;
  }
}

export const ukSpeech = new UkSpeechService();
