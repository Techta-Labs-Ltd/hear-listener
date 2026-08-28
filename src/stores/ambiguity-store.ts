import type {
  AmbiguitySelection,
  AmbiguityStore,
  PendingAmbiguity,
} from "@/types";
import { normalizeVoiceText } from "@/utils/voice/normalize";
import { create } from "zustand";

const ORDINAL_INDEX: Readonly<Record<string, number>> = {
  first: 0,
  "1st": 0,
  "1": 0,
  one: 0,
  "option 1": 0,
  "number 1": 0,
  "number one": 0,
  second: 1,
  "2nd": 1,
  "2": 1,
  two: 1,
  "option 2": 1,
  "number 2": 1,
  "number two": 1,
  third: 2,
  "3rd": 2,
  "3": 2,
  three: 2,
  "option 3": 2,
  "number 3": 2,
  "number three": 2,
  fourth: 3,
  "4th": 3,
  "4": 3,
  four: 3,
  "option 4": 3,
  "number 4": 3,
  "number four": 3,
};

export const useAmbiguityStore = create<AmbiguityStore>((set, get) => ({
  pending: undefined,
  setAmbiguity: (
    sessionId,
    requestId,
    choices,
    invocations,
    now = Date.now(),
  ) => {
    const pending: PendingAmbiguity = {
      interactionId: `ambiguity_${now}`,
      sessionId,
      requestId,
      alternatives: choices.map((choice, index) => {
        const invocation = invocations?.[index];
        const slots = invocation?.slots ?? {};
        const entityType =
          (slots.entityType as PendingAmbiguity["alternatives"][number]["entityType"]) ??
          (slots.storyId
            ? "story"
            : slots.topicId
              ? "category"
              : slots.locationId
                ? "location"
                : undefined);
        const entityId =
          (slots.entityId as string | undefined) ??
          (slots.storyId as string | undefined) ??
          (slots.topicId as string | undefined) ??
          (slots.locationId as string | undefined);
        return {
          id: choice.id,
          label: choice.label,
          choice,
          invocation,
          entityId,
          entityType,
          canonicalName:
            (slots.entityName as string | undefined) ??
            (slots.locationName as string | undefined) ??
            choice.label,
          score: invocation?.confidence,
        };
      }),
      selectedIndex: 0,
      createdAt: now,
      expiresAt: now + 30_000,
    };
    set({ pending });
    return pending;
  },
  getPending: (now = Date.now()) => {
    const pending = get().pending;
    if (pending && now > pending.expiresAt) {
      set({ pending: undefined });
      return undefined;
    }
    return pending;
  },
  moveSelection: (direction) => {
    const pending = get().getPending();
    if (!pending?.alternatives.length) return undefined;
    const count = pending.alternatives.length;
    const next = {
      ...pending,
      selectedIndex: (pending.selectedIndex + direction + count) % count,
    };
    set({ pending: next });
    return next;
  },
  selectIndex: (index) => {
    const pending = get().getPending();
    if (!pending || index < 0 || index >= pending.alternatives.length) {
      return undefined;
    }
    const next = { ...pending, selectedIndex: index };
    set({ pending: next });
    return selectionFrom(next);
  },
  confirmSelection: () => {
    const pending = get().getPending();
    return pending ? selectionFrom(pending) : undefined;
  },
  selectByTranscript: (transcript) => {
    const pending = get().getPending();
    if (!pending?.alternatives.length) return undefined;
    const normalized = normalizeVoiceText(transcript);
    const ordinal = ORDINAL_INDEX[normalized];
    if (ordinal !== undefined && ordinal < pending.alternatives.length) {
      return get().selectIndex(ordinal);
    }
    const matchIndex = pending.alternatives.findIndex((alternative) => {
      const label = normalizeVoiceText(alternative.label);
      return label.includes(normalized) || normalized.includes(label);
    });
    return matchIndex >= 0 ? get().selectIndex(matchIndex) : undefined;
  },
  clearAmbiguity: () => set({ pending: undefined }),
}));

function selectionFrom(
  pending: PendingAmbiguity,
): AmbiguitySelection | undefined {
  const selected = pending.alternatives[pending.selectedIndex];
  if (!selected) return undefined;
  return {
    id: selected.id,
    label: selected.label,
    choice: selected.choice,
    invocation: selected.invocation,
  };
}
