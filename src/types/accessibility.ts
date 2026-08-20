export type AccessibilityContextValue = {
  screenReaderEnabled: boolean;
  reduceMotionEnabled: boolean;
  spokenNavigationEnabled: boolean;
  setSpokenNavigationEnabled: (enabled: boolean) => void;
  announce: (message: string, key?: string) => void;
  stopSpeaking: () => void;
};
