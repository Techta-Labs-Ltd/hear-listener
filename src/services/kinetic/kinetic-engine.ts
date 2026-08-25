import type {
  KineticConfig,
  KineticEngineState,
  KineticGestureType,
  Vector3D,
} from "@/types";
import { DEFAULT_KINETIC_CONFIG } from "@/constants/kinetic";

export { DEFAULT_KINETIC_CONFIG };

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
  private shakeEvents: {
    time: number;
    sign: number;
    axis: string;
    magnitude: number;
  }[] = [];

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
    this.shakeEvents = [];
  }

  public processGyroscope(sample: Vector3D, now = Date.now()): void {
    this.gyroBuffer.push(sample);
    if (this.gyroBuffer.length > this.config.filterWindowSize) {
      this.gyroBuffer.shift();
    }

    const smoothedGyro = this.getSmoothedVector(this.gyroBuffer);
    const smoothedAccel = this.getSmoothedVector(this.accelBuffer);

    this.evaluateTiltState(smoothedGyro, smoothedAccel, now);
  }

  public processAccelerometer(sample: Vector3D, now = Date.now()): void {
    const rawMag = Math.sqrt(
      sample.x * sample.x + sample.y * sample.y + sample.z * sample.z,
    );
    const normFactor = rawMag > 4.0 ? 9.81 : 1.0;
    const normSample: Vector3D = {
      x: sample.x / normFactor,
      y: sample.y / normFactor,
      z: sample.z / normFactor,
    };

    this.accelBuffer.push(normSample);
    if (this.accelBuffer.length > this.config.filterWindowSize) {
      this.accelBuffer.shift();
    }

    const alpha = 0.8;
    this.gravity = {
      x: alpha * this.gravity.x + (1 - alpha) * normSample.x,
      y: alpha * this.gravity.y + (1 - alpha) * normSample.y,
      z: alpha * this.gravity.z + (1 - alpha) * normSample.z,
    };

    const linearX = normSample.x - this.gravity.x;
    const linearY = normSample.y - this.gravity.y;
    const linearZ = normSample.z - this.gravity.z;

    const linearMag = Math.sqrt(
      linearX * linearX + linearY * linearY + linearZ * linearZ,
    );

    this.evaluateShake(linearX, linearY, linearZ, linearMag, now);
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

  private evaluateShake(
    linearX: number,
    linearY: number,
    linearZ: number,
    linearMag: number,
    now: number,
  ): void {
    if (
      this.state === "LOCKED" &&
      now - this.candidateStartTime >= this.config.cooldownDurationMs &&
      linearMag < 0.25
    ) {
      this.setState("IDLE");
    }

    this.shakeEvents = this.shakeEvents.filter(
      (e) => now - e.time <= this.config.shakeWindowMs,
    );

    if (linearMag >= this.config.shakeThresholdG) {
      const absX = Math.abs(linearX);
      const absY = Math.abs(linearY);
      const absZ = Math.abs(linearZ);

      let primaryAxis = "x";
      let primarySign = Math.sign(linearX);

      if (absY >= absX && absY >= absZ) {
        primaryAxis = "y";
        primarySign = Math.sign(linearY);
      } else if (absZ >= absX && absZ >= absY) {
        primaryAxis = "z";
        primarySign = Math.sign(linearZ);
      }

      this.shakeEvents.push({
        time: now,
        sign: primarySign,
        axis: primaryAxis,
        magnitude: linearMag,
      });

      if (this.shakeEvents.length >= 2) {
        let signChanges = 0;
        for (let i = 1; i < this.shakeEvents.length; i++) {
          if (this.shakeEvents[i].sign !== this.shakeEvents[i - 1].sign) {
            signChanges++;
          }
        }

        if (signChanges >= 1 && this.state !== "LOCKED") {
          this.candidateStartTime = now;
          this.setState("LOCKED");
          this.shakeEvents = [];
          this.onGestureCallback?.("SHAKE");
        }
      }
    }
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
