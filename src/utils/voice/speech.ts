import { PREFERRED_UK_VOICE_NAMES } from "@/constants/voice-speech";
import type { Voice } from "expo-speech";

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

export function voiceScore(voice: Voice): number {
  const identity = `${voice.name} ${voice.identifier}`.toLowerCase();
  const preferredIndex = PREFERRED_UK_VOICE_NAMES.findIndex((name) =>
    identity.includes(name),
  );
  return (
    (voice.quality === "Enhanced" ? 100 : 0) +
    (identity.includes("network") || identity.includes("premium") ? 40 : 0) +
    (preferredIndex >= 0 ? 80 - preferredIndex : 0)
  );
}
