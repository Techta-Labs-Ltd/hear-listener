import type { ReactNode } from "react";
import type { AccountProvider } from "./account";
import type { VoiceState } from "./voice";

export type OnboardingScreenId = "welcome" | "voiceAccess" | "voiceTest" | "account";

export type OnboardingStepProps = {
  screenReaderEnabled: boolean;
};

export type WelcomeStepProps = OnboardingStepProps & {
  onContinue: () => void;
};

export type VoiceAccessStepProps = OnboardingStepProps & {
  onEnableVoice: () => void;
};

export type VoiceTestStepProps = OnboardingStepProps & {
  voiceState: VoiceState;
  voiceMessage?: string;
};

export type AccountStepProps = OnboardingStepProps & {
  signingIn: boolean;
  error?: string;
  onSignIn: (provider: AccountProvider) => void;
  onSkip: () => void;
};

export type OnboardingProgressProps = {
  current: 1 | 2 | 3;
  className?: string;
};

export type VoiceStatusBadgeProps = {
  label: string;
  className?: string;
};

export type PromptCardProps = {
  label: string;
  command: string;
  size?: "regular" | "large";
  className?: string;
};

export type OnboardingHeroProps = {
  children: ReactNode;
  height?: number;
  wash?: boolean;
  showWave?: boolean;
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
  notes?: readonly string[];
  inverse?: boolean;
  titleClassName?: string;
  className?: string;
};

export type ListeningPanelProps = {

  state: VoiceState;

  message?: string;
};

export type ProviderButtonProps = {
  onPress: () => void;
  loading?: boolean;
  className?: string;
};

export type OnboardingPhase =
  | "welcome"
  | "permissionPrimer"
  | "requestingPermission"
  | "preparing"
  | "listening"
  | "resolving"
  | "clarification"
  | "denied"
  | "unsupported"
  | "error"
  | "complete";

export type OnboardingGestureMode =
  | "inactive"
  | "advanceWelcome"
  | "startVoicePractice";

export type OnboardingChapterId = "welcome" | "voiceExperience" | "ready";
export type CapabilityStatus = "idle" | "requesting" | "ready" | "skipped" | "denied" | "error";
export type GuidanceChoice = "spoken" | "screen";
export type OnboardingChapterDefinition = {
  id: OnboardingChapterId;
  eyebrow: string;
  title: string;
  description: string;
  spokenPrompt: string;
  voiceCommands: readonly string[];
};
export type OnboardingValidationState = {
  guidanceChoice?: GuidanceChoice;
  voiceStatus: CapabilityStatus;
  soundStatus: CapabilityStatus;
  locationStatus: CapabilityStatus;
  town: string;
};
