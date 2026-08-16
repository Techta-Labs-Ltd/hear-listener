export type OnboardingScreenId = "welcome" | "voicePermission" | "account";

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

/** Legacy contracts retained for stored voice-command and validation compatibility. */
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
