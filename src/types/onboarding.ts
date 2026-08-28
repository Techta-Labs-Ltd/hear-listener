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
  voiceState?: VoiceState;
  voiceMessage?: string;
  transcript?: string;
  deadlineAt?: number;
  speechDetected?: boolean;
  onSignIn: (provider: AccountProvider) => void;
  onSkip: () => void;
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

export type OnboardingStepConfig = {
  id: string;
  component: (props: OnboardingStepProps) => ReactNode;
  gestureTarget: string;
  voiceHint: string;
  spokenGuidance: string;
  spokenGuidanceLong: string;
};

export type OnboardingFlowController = {
  currentStep: number;
  totalSteps: number;
  next: () => void;
  prev: () => void;
  goTo: (step: number) => void;
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
};

export type PromptCardProps = {
  label: string;
  command: string;
  size?: "regular" | "large";
  className?: string;
};

export type ProviderButtonProps = {
  onPress: () => void;
  loading?: boolean;
  className?: string;
};

export type OnboardingVoiceCommand =
  | { type: "continue" }
  | { type: "back" }
  | { type: "skip" }
  | { type: "requestPermission" }
  | { type: "retryVoiceTest" }
  | { type: "selectProvider"; provider: AccountProvider }
  | { type: "setTown"; name: string; locationId?: string }
  | { type: "read" }
  | { type: "useSpokenSetup" }
  | { type: "useScreenControls" }
  | { type: "playSoundCheck" }
  | { type: "cannotHear" }
  | { type: "useLocation" };

export type OnboardingVoiceStore = {
  gestureMode: OnboardingGestureMode;
  gestureLessonActive: boolean;
  gestureLessonCompleted: boolean;
  voiceInvocationAllowed: boolean;
  lastCommand?: OnboardingVoiceCommand & { id: number };
  gestureEvent?: { id: number; mode: OnboardingGestureMode };
  stepReadout?: OnboardingStepReadout;
  registerStep: (stepReadout: OnboardingStepReadout) => void;
  dispatch: (command: OnboardingVoiceCommand) => void;
  take: () => (OnboardingVoiceCommand & { id: number }) | undefined;
  setGestureMode: (mode: OnboardingGestureMode) => void;
  reportGesture: () => OnboardingGestureMode;
  setGestureLessonActive: (active: boolean) => void;
  completeGestureLesson: () => void;
  setVoiceInvocationAllowed: (allowed: boolean) => void;
  resetExperience: () => void;
};

export type OnboardingChapterId = "welcome" | "voiceExperience" | "ready";

export type OnboardingChapterDefinition = {
  readonly id: OnboardingChapterId;
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly spokenPrompt: string;
  readonly voiceCommands: readonly string[];
};

export type OnboardingValidationState = {
  guidanceChoice?: string | boolean;
  voiceStatus: "idle" | "requesting" | "granted" | "denied" | "skipped";
  soundStatus: "idle" | "requesting" | "played" | "skipped";
  locationStatus: "idle" | "requesting" | "granted" | "denied" | "skipped";
  town: string;
};

export type VoiceTestValidationResult = {
  valid: boolean;
  transcript: string;
  feedbackText: string;
  speechText: string;
};

export type AccountChoiceValidationResult = {
  valid: boolean;
  choice?: "apple" | "google" | "skip";
  transcript: string;
  feedbackText: string;
  speechText: string;
};
