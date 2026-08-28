import type {
  KineticConfig,
  KineticEngineState,
  KineticGestureType,
  Vector3D,
} from "@/types";
import { DEFAULT_KINETIC_CONFIG } from "@/constants/kinetic";

export { DEFAULT_KINETIC_CONFIG };

type ShakePeak = {
  time: number;
  axis: "x" | "y" | "z";
  sign: -1 | 1;
};

type GyroSample = {
  time: number;
  magnitude: number;
};

export class KineticGestureEngine {
  private config: KineticConfig;
  private state: KineticEngineState = "IDLE";
  private candidateStartTime = 0;
  private neutralStartTime = 0;
  private onGestureCallback?: (gesture: KineticGestureType) => void;
  private onStateChangeCallback?: (state: KineticEngineState) => void;

  private gyroBuffer: Vector3D[] = [];
  private accelBuffer: Vector3D[] = [];
  private gravity: Vector3D = { x: 0, y: 0, z: 1.0 };
  private gyroSamples: GyroSample[] = [];
  private lastGyroMagnitude = 0;
  private lastGyroTime = 0;
  private lastLinearMagnitude = 0;

  private shakePeaks: ShakePeak[] = [];
  private shakeWarmupUntil = 0;
  private shakeSuppressedUntil = 0;
  private shakeCooldownUntil = 0;
  private shakeNeutralStartTime = 0;
  private shakeArmed = false;
  private shakeRequiresNeutral = false;

  constructor(
    config: Partial<KineticConfig> = {},
    onGesture?: (gesture: KineticGestureType) => void,
    onStateChange?: (state: KineticEngineState) => void,
  ) {
    this.config = { ...DEFAULT_KINETIC_CONFIG, ...config };
    this.onGestureCallback = onGesture;
    this.onStateChangeCallback = onStateChange;
  }

  public setOnGesture(callback: (gesture: KineticGestureType) => void): void {
    this.onGestureCallback = callback;
  }

  public setOnStateChange(callback: (state: KineticEngineState) => void): void {
    this.onStateChangeCallback = callback;
  }

  public getState(): KineticEngineState {
    return this.state;
  }

  public suppressShakeFor(durationMs: number, now = Date.now()): void {
    this.shakeSuppressedUntil = Math.max(
      this.shakeSuppressedUntil,
      now + durationMs,
    );
    this.shakeCooldownUntil = Math.max(
      this.shakeCooldownUntil,
      now + durationMs,
    );
    this.shakeRequiresNeutral = true;
    this.shakeArmed = false;
    this.shakeNeutralStartTime = 0;
    this.clearShakeCandidates();
  }

  private setState(next: KineticEngineState): void {
    if (this.state !== next) {
      this.state = next;
      this.onStateChangeCallback?.(next);
    }
  }

  public reset(): void {
    this.setState("IDLE");
    this.candidateStartTime = 0;
    this.neutralStartTime = 0;
    this.gyroBuffer = [];
    this.accelBuffer = [];
    this.gravity = { x: 0, y: 0, z: 1.0 };
    this.gyroSamples = [];
    this.lastGyroMagnitude = 0;
    this.lastGyroTime = 0;
    this.lastLinearMagnitude = 0;
    this.shakeWarmupUntil = 0;
    this.shakeSuppressedUntil = 0;
    this.shakeCooldownUntil = 0;
    this.shakeNeutralStartTime = 0;
    this.shakeArmed = false;
    this.shakeRequiresNeutral = false;
    this.clearShakeCandidates();
  }

  public processGyroscope(sample: Vector3D, now = Date.now()): void {
    this.gyroBuffer.push(sample);
    if (this.gyroBuffer.length > this.config.filterWindowSize) {
      this.gyroBuffer.shift();
    }

    const magnitude = this.vectorMagnitude(sample);
    this.lastGyroMagnitude = magnitude;
    this.lastGyroTime = now;
    this.gyroSamples.push({ time: now, magnitude });
    this.gyroSamples = this.gyroSamples.filter(
      (entry) =>
        now - entry.time <=
        this.config.shakeWindowMs + this.config.shakeGyroCorrelationMs,
    );

    const smoothedGyro = this.getSmoothedVector(this.gyroBuffer);
    const smoothedAccel = this.getSmoothedVector(this.accelBuffer);

    this.evaluateTiltState(smoothedGyro, smoothedAccel, now);
    this.evaluateShake(now);
  }

  public processAccelerometer(sample: Vector3D, now = Date.now()): void {
    if (this.shakeWarmupUntil === 0) {
      this.shakeWarmupUntil = now + this.config.shakeWarmupDurationMs;
    }

    this.accelBuffer.push(sample);
    if (this.accelBuffer.length > this.config.filterWindowSize) {
      this.accelBuffer.shift();
    }

    const alpha = 0.8;
    this.gravity = {
      x: alpha * this.gravity.x + (1 - alpha) * sample.x,
      y: alpha * this.gravity.y + (1 - alpha) * sample.y,
      z: alpha * this.gravity.z + (1 - alpha) * sample.z,
    };

    const linearX = sample.x - this.gravity.x;
    const linearY = sample.y - this.gravity.y;
    const linearZ = sample.z - this.gravity.z;

    this.lastLinearMagnitude = Math.sqrt(
      linearX * linearX + linearY * linearY + linearZ * linearZ,
    );

    this.recordShakePeak(linearX, linearY, linearZ, this.lastLinearMagnitude, now);
    this.evaluateShake(now);
  }

  private evaluateTiltState(
    gyro: Vector3D,
    accel: Vector3D,
    now: number,
  ): void {
    const omegaY = gyro.y;
    const isScreenFacingUp = accel.z > 0.1;

    switch (this.state) {
      case "IDLE": {
        if (isScreenFacingUp) {
          if (omegaY >= this.config.tiltVelocityThreshold) {
            this.setState("CANDIDATE_TILT_RIGHT");
            this.candidateStartTime = now;
          } else if (omegaY <= -this.config.tiltVelocityThreshold) {
            this.setState("CANDIDATE_TILT_LEFT");
            this.candidateStartTime = now;
          }
        }
        break;
      }

      case "CANDIDATE_TILT_RIGHT": {
        if (!isScreenFacingUp || omegaY < this.config.tiltVelocityThreshold) {
          this.setState("IDLE");
        } else if (
          now - this.candidateStartTime >=
          this.config.tiltHoldDurationMs
        ) {
          this.setState("LOCKED");
          this.clearShakeCandidates();
          this.onGestureCallback?.("NEXT");
        }
        break;
      }

      case "CANDIDATE_TILT_LEFT": {
        if (!isScreenFacingUp || omegaY > -this.config.tiltVelocityThreshold) {
          this.setState("IDLE");
        } else if (
          now - this.candidateStartTime >=
          this.config.tiltHoldDurationMs
        ) {
          this.setState("LOCKED");
          this.clearShakeCandidates();
          this.onGestureCallback?.("PREVIOUS");
        }
        break;
      }

      case "LOCKED": {
        if (Math.abs(omegaY) < this.config.neutralVelocityThreshold) {
          this.setState("COOLDOWN");
          this.neutralStartTime = now;
        }
        break;
      }

      case "COOLDOWN": {
        if (Math.abs(omegaY) >= this.config.neutralVelocityThreshold) {
          this.setState("LOCKED");
        } else if (
          now - this.neutralStartTime >=
          this.config.cooldownDurationMs
        ) {
          this.setState("IDLE");
        }
        break;
      }
    }
  }

  private recordShakePeak(
    linearX: number,
    linearY: number,
    linearZ: number,
    linearMagnitude: number,
    now: number,
  ): void {
    if (!this.canCollectShake(now) || linearMagnitude < this.config.shakeThresholdG) {
      return;
    }

    const peak = this.getDominantPeak(linearX, linearY, linearZ, linearMagnitude, now);
    if (!peak) return;

    const previous = this.shakePeaks.at(-1);
    if (!previous) {
      this.shakePeaks = [peak];
      return;
    }

    const elapsed = peak.time - previous.time;
    if (elapsed > this.config.shakePeakMaxGapMs) {
      this.shakePeaks = [peak];
      return;
    }

    if (peak.axis !== previous.axis || elapsed < this.config.shakePeakMinGapMs) {
      this.shakeRequiresNeutral = true;
      this.shakeArmed = false;
      this.shakeNeutralStartTime = 0;
      this.clearShakeCandidates();
      return;
    }

    if (peak.sign !== previous.sign) {
      this.shakePeaks.push(peak);
    }
  }

  private evaluateShake(now: number): void {
    if (this.shakeWarmupUntil === 0 || now < this.shakeWarmupUntil) {
      this.clearShakeCandidates();
      return;
    }

    if (!this.canCollectShake(now)) {
      this.clearShakeCandidates();
      return;
    }

    if (!this.shakeArmed) {
      this.clearShakeCandidates();
      if (this.isNeutral(now)) {
        if (this.shakeNeutralStartTime === 0) {
          this.shakeNeutralStartTime = now;
        }
        const requiredNeutralDuration = this.shakeRequiresNeutral
          ? this.config.shakeNeutralDurationMs
          : 0;
        if (now - this.shakeNeutralStartTime >= requiredNeutralDuration) {
          this.shakeArmed = true;
          this.shakeRequiresNeutral = false;
          this.shakeNeutralStartTime = 0;
        }
      } else {
        this.shakeNeutralStartTime = 0;
      }
      return;
    }

    if (this.shakePeaks.length < this.config.shakeRequiredPeaks) return;

    const firstPeak = this.shakePeaks[0];
    const lastPeak = this.shakePeaks.at(-1);
    if (!firstPeak || !lastPeak) return;

    if (lastPeak.time - firstPeak.time > this.config.shakeWindowMs) {
      this.clearShakeCandidates();
      return;
    }

    const gyroQualifiedPeaks = this.shakePeaks.filter((peak) =>
      this.hasGyroMotionNear(peak.time),
    ).length;
    if (gyroQualifiedPeaks < this.config.shakeRequiredGyroPeaks) return;

    this.candidateStartTime = now;
    this.shakeCooldownUntil = now + this.config.shakeCooldownDurationMs;
    this.shakeRequiresNeutral = true;
    this.shakeArmed = false;
    this.shakeNeutralStartTime = 0;
    this.clearShakeCandidates();
    this.setState("LOCKED");
    this.onGestureCallback?.("SHAKE");
  }

  private canCollectShake(now: number): boolean {
    return (
      now >= this.shakeSuppressedUntil &&
      now >= this.shakeCooldownUntil &&
      this.state !== "LOCKED" &&
      this.state !== "COOLDOWN"
    );
  }

  private isNeutral(now: number): boolean {
    return (
      this.lastLinearMagnitude < this.config.shakeReleaseThresholdG &&
      this.getCurrentGyroMagnitude(now) < this.config.shakeNeutralGyroThresholdRadS
    );
  }

  private getDominantPeak(
    x: number,
    y: number,
    z: number,
    magnitude: number,
    time: number,
  ): ShakePeak | null {
    const values: ["x" | "y" | "z", number][] = [
      ["x", x],
      ["y", y],
      ["z", z],
    ];
    const [axis, value] = values.reduce((largest, current) =>
      Math.abs(current[1]) > Math.abs(largest[1]) ? current : largest,
    );

    if (Math.abs(value) / magnitude < this.config.shakeAxisDominanceRatio) {
      return null;
    }

    return { time, axis, sign: value < 0 ? -1 : 1 };
  }

  private hasGyroMotionNear(time: number): boolean {
    return this.gyroSamples.some(
      (sample) =>
        Math.abs(sample.time - time) <= this.config.shakeGyroCorrelationMs &&
        sample.magnitude >= this.config.shakeGyroThresholdRadS,
    );
  }

  private getCurrentGyroMagnitude(now: number): number {
    return now - this.lastGyroTime <= this.config.samplingIntervalMs * 3
      ? this.lastGyroMagnitude
      : 0;
  }

  private clearShakeCandidates(): void {
    this.shakePeaks = [];
  }

  private vectorMagnitude(vector: Vector3D): number {
    return Math.sqrt(
      vector.x * vector.x + vector.y * vector.y + vector.z * vector.z,
    );
  }

  private getSmoothedVector(buffer: Vector3D[]): Vector3D {
    if (buffer.length === 0) return { x: 0, y: 0, z: 0 };
    const sum = buffer.reduce(
      (acc, val) => ({
        x: acc.x + val.x,
        y: acc.y + val.y,
        z: acc.z + val.z,
      }),
      { x: 0, y: 0, z: 0 },
    );
    return {
      x: sum.x / buffer.length,
      y: sum.y / buffer.length,
      z: sum.z / buffer.length,
    };
  }
}
