import { create } from "zustand";
import type {
  KineticEngineState,
  KineticGestureListener,
  KineticGestureType,
  KineticStoreState,
} from "@/types";

export const useKineticStore = create<KineticStoreState>((set, get) => ({
  engineState: "IDLE",
  lastGesture: null,
  activeListener: null,
  setEngineState: (engineState: KineticEngineState) => set({ engineState }),
  setLastGesture: (lastGesture: KineticGestureType | null) => set({ lastGesture }),
  registerListener: (listener: KineticGestureListener) => {
    set({ activeListener: listener });
    return () => {
      if (get().activeListener === listener) {
        set({ activeListener: null });
      }
    };
  },
}));
