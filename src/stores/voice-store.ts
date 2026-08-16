import { create } from "zustand";
import type { VoiceChoice, VoiceState, VoiceStore } from "@/types";
const initialVoice = {
  state: "idle" as VoiceState,
  sessionId: undefined,
  transcript: "",
  message: "",
  prompt: "",
  choices: [] as VoiceChoice[],
  errorCode: undefined,
  retryable: false,
};
export const useVoiceStore = create<VoiceStore>((set) => ({
  ...initialVoice,
  setVoice: (change) => set(change),
  resetVoice: () => set(initialVoice),
}));
