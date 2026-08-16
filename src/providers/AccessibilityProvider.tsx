import { AccessibilityInfo } from "react-native";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { speechCoordinator } from "@/lib/voice/speech-coordinator";
import { usePreferencesStore } from "@/stores";

type AccessibilityContextValue = {
  screenReaderEnabled: boolean;
  reduceMotionEnabled: boolean;
  spokenNavigationEnabled: boolean;
  setSpokenNavigationEnabled: (enabled: boolean) => void;
  announce: (message: string, key?: string) => void;
  stopSpeaking: () => void;
};

const AccessibilityContext = createContext<
  AccessibilityContextValue | undefined
>(undefined);

export function AccessibilityProvider({ children }: PropsWithChildren) {
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const spokenNavigationEnabled = usePreferencesStore(
    (state) => state.spokenGuidanceEnabled,
  );
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const setSpokenNavigationEnabled = useCallback(
    (enabled: boolean) => updatePreferences({ spokenGuidanceEnabled: enabled }),
    [updatePreferences],
  );

  useEffect(() => {
    void AccessibilityInfo.isScreenReaderEnabled().then(setScreenReaderEnabled);
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotionEnabled);
    const screenReader = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setScreenReaderEnabled,
    );
    const reduceMotion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotionEnabled,
    );
    return () => {
      screenReader.remove();
      reduceMotion.remove();
    };
  }, []);

  const stopSpeaking = useCallback(() => {
    void speechCoordinator.cancel();
  }, []);
  const announce = useCallback(
    (message: string, key = `accessibility:${message}`) => {
      if (!screenReaderEnabled && !spokenNavigationEnabled) return;
      void speechCoordinator.announce({ key, text: message, priority: "screen" });
    },
    [screenReaderEnabled, spokenNavigationEnabled],
  );

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      screenReaderEnabled,
      reduceMotionEnabled,
      spokenNavigationEnabled,
      setSpokenNavigationEnabled,
      announce,
      stopSpeaking,
    }),
    [
      announce,
      reduceMotionEnabled,
      screenReaderEnabled,
      spokenNavigationEnabled,
      setSpokenNavigationEnabled,
      stopSpeaking,
    ],
  );
  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAppAccessibility() {
  const accessibility = useContext(AccessibilityContext);
  if (!accessibility)
    throw new Error(
      "useAppAccessibility must be used inside AccessibilityProvider",
    );
  return accessibility;
}
