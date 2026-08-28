import {
  createPendingExternalInteraction,
  transitionExternalInteraction,
} from "@/utils/voice/external-interaction";
import type { ExternalVoiceStore } from "@/types";
import { create } from "zustand";

const initialExternalVoiceState = {
  status: "idle" as const,
  error: null,
  lastResponse: null,
  pending: undefined,
};

export const useExternalVoiceStore = create<ExternalVoiceStore>((set, get) => ({
  ...initialExternalVoiceState,
  beginRequest: () => set({ status: "resolving", error: null }),
  receiveResponse: (response, context, now) => {
    const pending = createPendingExternalInteraction(response, context, now);
    set({
      status: response.kind === "error" ? "error" : "success",
      error: response.kind === "error" ? response.message : null,
      lastResponse: response,
      pending,
    });
    return pending;
  },
  cancelRequest: () => set({ status: "idle", error: null }),
  getPending: (now = Date.now()) => {
    const pending = get().pending;
    if (pending && pending.expiresAt <= now) {
      set({ pending: undefined });
      return undefined;
    }
    return pending;
  },
  interpretPending: (transcript, now) => {
    const pending = get().getPending(now);
    if (!pending) return undefined;
    const transition = transitionExternalInteraction(pending, transcript);
    if (transition.pending !== pending) {
      set({ pending: transition.pending });
    }
    return transition.decision;
  },
  clearPending: () => set({ pending: undefined }),
  resetExternalVoice: () => set(initialExternalVoiceState),
}));
