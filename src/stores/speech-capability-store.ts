import { create } from "zustand";
import type { SpeechCapabilityStore } from "@/types";

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
