import type { FeedbackVoiceStore } from "@/types";
import { create } from "zustand";

export const useFeedbackVoiceStore = create<FeedbackVoiceStore>((set) => ({
  activeTarget: undefined,
  pendingRating: undefined,
  startFeedback: (activeTarget) =>
    set({ activeTarget, pendingRating: undefined }),
  setRating: (pendingRating) => set({ pendingRating }),
  clearFeedback: () =>
    set({ activeTarget: undefined, pendingRating: undefined }),
}));
