export type VoicePermissionState = {
  microphone: "unknown" | "granted" | "denied";
  speechRecognition:
    | "not-required"
    | "unknown"
    | "granted"
    | "denied"
    | "restricted";
  canAskMicrophoneAgain?: boolean;
  canAskSpeechAgain?: boolean;
};

export type SpeechPermissionFailure =
  | "microphone-denied"
  | "speech-denied"
  | "speech-restricted"
  | "recognition-unavailable";

export type RecognitionPurpose =
  | "command"
  | "entity-search"
  | "short-response"
  | "dictation";

export type VoiceRecognitionExpectation =
  | "natural-command"
  | "entity-search"
  | "short-response";

export type AndroidSpeechModelState =
  | "unknown"
  | "checking"
  | "missing"
  | "download-requested"
  | "download-scheduled"
  | "installed"
  | "unsupported"
  | "error";

export type PlatformSpeechCapabilities = {
  platform: "android" | "ios" | "web" | "unknown";
  recognitionAvailable: boolean;
  onDeviceSupported: boolean;
  services: string[];
  defaultService: string;
  selectedService?: string;
  apiLevel?: number;
};

export type SpeechBootstrapResult = {
  ready: boolean;
  permissionState: VoicePermissionState;
  capabilities: PlatformSpeechCapabilities;
  onDeviceFallback: boolean;
  failureReason?: SpeechPermissionFailure;
};

export type PreparedAsrHypothesis = {
  rawTranscript: string;
  sanitizedTranscript: string;
  confidence?: number;
  rank: number;
};

export type SpeechCapabilityStore = {
  capabilities: PlatformSpeechCapabilities | null;
  permissionState: VoicePermissionState | null;
  modelState: AndroidSpeechModelState;
  setCapabilities: (capabilities: PlatformSpeechCapabilities) => void;
  setPermissionState: (state: VoicePermissionState) => void;
  setModelState: (state: AndroidSpeechModelState) => void;
  reset: () => void;
};
