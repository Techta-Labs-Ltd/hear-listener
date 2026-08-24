import { create } from "zustand";
import type { SpeechStore } from "@/types";

const initialSpeech = {
  isSpeaking: false,
  currentUtterance: null,
  speechState: "idle" as const,
};

export const useSpeechStore = create<SpeechStore>((set) => ({
  ...initialSpeech,
  setSpeaking: (isSpeaking: boolean, currentUtterance: string | null = null) =>
    set({
      isSpeaking,
      currentUtterance: isSpeaking ? currentUtterance : null,
      speechState: isSpeaking ? "speaking" : "idle",
    }),
  setSpeechState: (speechState) =>
    set({
      speechState,
      isSpeaking: speechState === "speaking",
    }),
  resetSpeech: () => set(initialSpeech),
}));
