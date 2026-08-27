import type { OnboardingStepReadout } from "./onboarding";
import type { PlaybackSnapshot } from "./playback";
import type { Preferences } from "./preferences";

export type AccessibilitySpeechPolicy = {
  screenReaderEnabled: boolean;
  spokenNavigationEnabled: boolean;
  voiceCaptureActive: boolean;
  canUseHearTts: boolean;
  canUseRoutineNativeAnnouncement: boolean;
  suppressDynamicAccessibility: boolean;
};

export type AccessibilityContextValue = {
  screenReaderEnabled: boolean;
  reduceMotionEnabled: boolean;
  spokenNavigationEnabled: boolean;
  setSpokenNavigationEnabled: (enabled: boolean) => void;
  announce: (message: string, key?: string, force?: boolean) => void;
  stopSpeaking: () => void;
};

export type ReadoutContext = {
  pathname: string;
  playback: Pick<PlaybackSnapshot, "current" | "playing" | "progress" | "speed">;
  preferences: Preferences;
  onboardingStep?: OnboardingStepReadout;
  screenReaderEnabled?: boolean;
};
