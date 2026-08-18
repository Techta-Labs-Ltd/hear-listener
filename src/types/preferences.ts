export type Preferences = {
  setupComplete: boolean;
  onboardingVersion: number;
  spokenGuidanceEnabled: boolean;
  town: string;
  interests: string[];
  savedIds: string[];
  followingIds: string[];
  downloadedIds: string[];
  voiceDiagnosticsEnabled: boolean;
  voiceConsentVersion: number;
  homeGuideDismissed: boolean;
};

export type PreferencesStore = Preferences & {
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  updatePreferences: (change: Partial<Preferences>) => void;
  resetPreferences: () => void;
};
