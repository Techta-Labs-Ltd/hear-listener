import { safeAsyncStorage } from "@/lib/storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type { Preferences, PreferencesStore } from "@/types";

export const initialPreferences: Preferences = {
  setupComplete: false,
  onboardingVersion: 4,
  spokenGuidanceEnabled: false,
  town: "",
  interests: [],
  savedIds: [],
  followingIds: [],
  downloadedIds: [],
  voiceDiagnosticsEnabled: false,
  voiceConsentVersion: 1,
  homeGuideDismissed: false,
};
export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      ...initialPreferences,
      hydrated: false,
      setHydrated: (hydrated) => set({ hydrated }),
      updatePreferences: (change) => set(change),
      resetPreferences: () => set(initialPreferences),
    }),
    {
      name: "hear-preferences",
      version: 5,
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: ({
        setupComplete,
        onboardingVersion,
        spokenGuidanceEnabled,
        town,
        interests,
        savedIds,
        followingIds,
        downloadedIds,
        voiceDiagnosticsEnabled,
        voiceConsentVersion,
        homeGuideDismissed,
      }) => ({
        setupComplete,
        onboardingVersion,
        spokenGuidanceEnabled,
        town,
        interests,
        savedIds,
        followingIds,
        downloadedIds,
        voiceDiagnosticsEnabled,
        voiceConsentVersion,
        homeGuideDismissed,
      }),
      migrate: migratePreferences,
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

export function usePreferences() {
  const preferences = usePreferencesStore(
    useShallow(
      ({
        setupComplete,
        onboardingVersion,
        spokenGuidanceEnabled,
        town,
        interests,
        savedIds,
        followingIds,
        downloadedIds,
        voiceDiagnosticsEnabled,
        voiceConsentVersion,
        homeGuideDismissed,
      }) => ({
        setupComplete,
        onboardingVersion,
        spokenGuidanceEnabled,
        town,
        interests,
        savedIds,
        followingIds,
        downloadedIds,
        voiceDiagnosticsEnabled,
        voiceConsentVersion,
        homeGuideDismissed,
      }),
    ),
  );
  const ready = usePreferencesStore((state) => state.hydrated);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const reset = usePreferencesStore((state) => state.resetPreferences);
  return {
    preferences,
    ready,
    updatePreferences,
    resetPreferences: async () => reset(),
  };
}

export function migratePreferences(stored: unknown): Preferences {
  if (!isRecord(stored)) return initialPreferences;
  return {
    setupComplete:
      typeof stored.setupComplete === "boolean"
        ? stored.setupComplete
        : initialPreferences.setupComplete,
    onboardingVersion:
      typeof stored.onboardingVersion === "number"
        ? stored.onboardingVersion
        : 1,
    spokenGuidanceEnabled:
      typeof stored.spokenGuidanceEnabled === "boolean"
        ? stored.spokenGuidanceEnabled
        : false,
    town: typeof stored.town === "string" ? stored.town : "",
    interests: stringArray(stored.interests),
    savedIds: stringArray(stored.savedIds),
    followingIds: stringArray(stored.followingIds),
    downloadedIds: stringArray(stored.downloadedIds),
    voiceDiagnosticsEnabled:
      typeof stored.voiceDiagnosticsEnabled === "boolean"
        ? stored.voiceDiagnosticsEnabled
        : false,
    voiceConsentVersion:
      typeof stored.voiceConsentVersion === "number"
        ? stored.voiceConsentVersion
        : initialPreferences.voiceConsentVersion,
    homeGuideDismissed:
      typeof stored.homeGuideDismissed === "boolean"
        ? stored.homeGuideDismissed
        : false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string"))]
    : [];
}
