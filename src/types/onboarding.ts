import type { ReactNode } from "react";
import type { AccountProvider } from "./account";
import type { VoiceState } from "./voice";

export type OnboardingScreenId =
  | "welcome"
  | "voiceAccess"
  | "permissionDenied"
  | "permissionBlocked"
  | "voiceTestReady"
  | "voiceTest"
  | "account";

export type OnboardingStepProps = {
  screenReaderEnabled: boolean;
};

export type WelcomeStepProps = OnboardingStepProps & {
  onContinue: () => void;
};

export type VoiceAccessStepProps = OnboardingStepProps & {
  phase: OnboardingPhase;
  voiceState: VoiceState;
  voiceMessage?: string;
  transcript?: string;
  deadlineAt?: number;
  speechDetected?: boolean;
  onRequestPermission: () => void;
  onOpenSettings: () => void;
  onRetryVoiceTest: () => void;
  onEnableVoice?: () => void;
};

export type AccountStepProps = OnboardingStepProps & {
  signingIn: boolean;
  error?: string;
  onSignIn: (provider: AccountProvider) => void;
  onSkip: () => void;
  onDoubleTap?: () => void;
};

export type OnboardingProgressProps = {
  current: 1 | 2 | 3;
  className?: string;
};

export type OnboardingPhase =
  | "welcome"
  | "permissionIntro"
  | "requestingPermission"
  | "permissionDenied"
  | "permissionBlocked"
  | "voiceTestReady"
  | "voiceTestListening"
  | "voiceTestSuccess"
  | "voiceTestError"
  | "account";

export type OnboardingGestureMode =
  | "advanceWelcome"
  | "requestPermission"
  | "startVoiceTest"
  | "permissionDenied"
  | "accountSelection"
  | "inactive";

export type OnboardingCopyPreset = {
  eyebrow: string;
  title: string;
  description: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  notes?: string[];
};

export type OnboardingPresetKey =
  | "welcome"
  | "voiceAccess"
  | "permissionDenied"
  | "voiceTestReady"
  | "voiceTest"
  | "account";

export type OnboardingStepData = {
  stepIndex: number;
  totalSteps: number;
  title: string;
  description: string;
  options: string[];
};

export type OnboardingStepReadout = {
  stepIndex: number;
  totalSteps: number;
  title: string;
  description: string;
  options: string[];
};

export type FactListRowProps = {
  title: string;
  description: string;
  hideDivider?: boolean;
  className?: string;
};

export type InstructionFooterProps = {
  title: string;
  subtitle: string;
  notes?: string[];
  inverse?: boolean;
  titleClassName?: string;
  className?: string;
};

export type OnboardingHeroProps = {
  children?: ReactNode;
  height?: number;
  wash?: boolean;
  showWave?: boolean;
  className?: string;
};

export type PromptCardProps = {
  label: string;
  command: string;
  size?: "small" | "medium" | "large" | "regular";
  className?: string;
};

export type ProviderButtonProps = {
  loading?: boolean;
  onPress: () => void;
  className?: string;
};

export type OnboardingVoiceCommand = {
  type:
    | "continue"
    | "back"
    | "skip"
    | "retry"
    | "speak"
    | "setTown"
    | "read"
    | "useSpokenSetup"
    | "useScreenControls"
    | "playSoundCheck"
    | "cannotHear"
    | "useLocation";
  id?: number;
  town?: string;
  locationId?: string;
  name?: string;
  text?: string;
};

export type OnboardingVoiceStore = {
  gestureMode: OnboardingGestureMode;
  gestureLessonActive: boolean;
  gestureLessonCompleted: boolean;
  voiceInvocationAllowed: boolean;
  stepReadout?: OnboardingStepReadout;
  lastCommand?: OnboardingVoiceCommand & { id: number };
  gestureEvent?: { id: number; mode: OnboardingGestureMode };
  registerStep: (stepReadout: OnboardingStepReadout) => void;
  dispatch: (command: OnboardingVoiceCommand) => void;
  take: () => (OnboardingVoiceCommand & { id: number }) | undefined;
  setGestureMode: (gestureMode: OnboardingGestureMode) => void;
  reportGesture: () => OnboardingGestureMode;
  setGestureLessonActive: (active: boolean) => void;
  completeGestureLesson: () => void;
  setVoiceInvocationAllowed: (voiceInvocationAllowed: boolean) => void;
  resetExperience: () => void;
};

export type OnboardingChapterId = "welcome" | "voiceExperience" | "ready";

export type OnboardingChapterDefinition = {
  id: OnboardingChapterId;
  eyebrow: string;
  title: string;
  description: string;
  spokenPrompt: string;
  voiceCommands: readonly string[];
};

export type OnboardingValidationState = {
  guidanceChoice?: string;
  voiceStatus?: "idle" | "requesting" | "granted" | "denied" | "skipped";
  soundStatus?: "idle" | "requesting" | "played" | "cannotHear" | "skipped";
  locationStatus?: "idle" | "requesting" | "granted" | "denied";
  town: string;
};
