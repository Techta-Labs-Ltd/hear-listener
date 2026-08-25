import { create } from "zustand";
import type {
  AndroidSpeechModelState,
  PlatformSpeechCapabilities,
  VoicePermissionState,
} from "@/types";

type SpeechCapabilityStore = {
  capabilities: PlatformSpeechCapabilities | null;
  permissionState: VoicePermissionState | null;
  modelState: AndroidSpeechModelState;
  setCapabilities: (capabilities: PlatformSpeechCapabilities) => void;
  setPermissionState: (state: VoicePermissionState) => void;
  setModelState: (state: AndroidSpeechModelState) => void;
  reset: () => void;
};

export const useSpeechCapabilityStore = create<SpeechCapabilityStore>(
  (set) => ({
    capabilities: null,
    permissionState: null,
    modelState: "unknown",
    setCapabilities: (capabilities) => set({ capabilities }),
    setPermissionState: (permissionState) => set({ permissionState }),
    setModelState: (modelState) => set({ modelState }),
    reset: () =>
      set({ capabilities: null, permissionState: null, modelState: "unknown" }),
  }),
);
