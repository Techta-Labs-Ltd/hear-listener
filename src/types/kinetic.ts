export interface Vector3D {
  x: number;
  y: number;
  z: number;
  timestamp?: number;
}

export type KineticGestureType = "NEXT" | "PREVIOUS" | "SHAKE";

export type KineticEngineState =
  | "IDLE"
  | "CANDIDATE_TILT_RIGHT"
  | "CANDIDATE_TILT_LEFT"
  | "LOCKED"
  | "COOLDOWN";

export interface KineticConfig {
  samplingIntervalMs: number;
  tiltVelocityThreshold: number;
  tiltHoldDurationMs: number;
  neutralVelocityThreshold: number;
  cooldownDurationMs: number;
  shakeThresholdG: number;
  shakeWindowMs: number;
  filterWindowSize: number;
}

export interface KineticGestureListener {
  onNext?: () => void | Promise<void>;
  onPrevious?: () => void | Promise<void>;
  onShake?: () => void | Promise<void>;
}

export interface KineticStoreState {
  engineState: KineticEngineState;
  lastGesture: KineticGestureType | null;
  activeListener: KineticGestureListener | null;
  setEngineState: (state: KineticEngineState) => void;
  setLastGesture: (gesture: KineticGestureType | null) => void;
  registerListener: (listener: KineticGestureListener) => () => void;
}

export interface KineticContextValue {
  registerKineticHandler: (listener: KineticGestureListener) => () => void;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}
