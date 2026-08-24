import type { KineticConfig } from "@/types";

export const DEFAULT_KINETIC_CONFIG: KineticConfig = {
  samplingIntervalMs: 20,
  tiltVelocityThreshold: 2.2,
  tiltHoldDurationMs: 60,
  neutralVelocityThreshold: 0.5,
  cooldownDurationMs: 350,
  shakeThresholdG: 0.45,
  shakeWindowMs: 650,
  filterWindowSize: 5,
};
