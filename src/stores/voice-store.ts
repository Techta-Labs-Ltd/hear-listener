import { create } from "zustand";
import type {
  ExternalResolverResponse,
  ExternalResolverStatus,
  VoiceChoice,
  VoiceState,
  VoiceStore,
} from "@/types";

const initialVoice = {
  state: "idle" as VoiceState,
  isVoiceActive: false,
  isDockVisible: false,
  sessionId: undefined,
  transcript: "",
  message: "",
  prompt: "",
  choices: [] as VoiceChoice[],
  errorCode: undefined,
  retryable: false,
  listeningStartedAt: undefined,
  listeningDeadlineAt: undefined,
  speechDetected: false,
  activeScreenId: null,
  activeScreenTitle: null,
  externalResolving: false,
  externalStatus: "idle" as ExternalResolverStatus,
  externalError: null as string | null,
  lastExternalResponse: null as ExternalResolverResponse | null,
};

export const useVoiceStore = create<VoiceStore>((set) => ({
  ...initialVoice,
  setVoice: (change) =>
    set((current) => {
      const nextState = change.state ?? current.state;
      const isVoiceActive =
        change.isVoiceActive ??
        (nextState !== "idle" && nextState !== "cancelled");
      const isDockVisible =
        change.isDockVisible ?? (isVoiceActive && nextState !== "idle");
      return {
        ...change,
        isVoiceActive,
        isDockVisible,
      };
    }),
  resetVoice: () => set(initialVoice),
}));
