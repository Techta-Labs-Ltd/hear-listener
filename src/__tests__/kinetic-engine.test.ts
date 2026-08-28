import { KineticGestureEngine } from "../services/kinetic/kinetic-engine";
import type { KineticGestureType } from "@/types";

describe("KineticGestureEngine", () => {
  let engine: KineticGestureEngine;
  let firedGestures: KineticGestureType[];

  beforeEach(() => {
    firedGestures = [];
    engine = new KineticGestureEngine(
      {
        samplingIntervalMs: 20,
        tiltVelocityThreshold: 2.2,
        tiltHoldDurationMs: 60,
        neutralVelocityThreshold: 0.5,
        cooldownDurationMs: 350,
        shakeThresholdG: 0.75,
        shakeWindowMs: 450,
        filterWindowSize: 3,
      },
      (gesture) => {
        firedGestures.push(gesture);
      },
    );
  });

  describe("Tilt Right (NEXT)", () => {
    it("fires NEXT when roll angular velocity exceeds threshold with screen facing upward", () => {
      let now = 1000;
      for (let i = 0; i < 3; i++) {
        engine.processAccelerometer({ x: 0, y: 0, z: 1.0 }, now);
      }

      engine.processGyroscope({ x: 0, y: 3.0, z: 0 }, now);
      expect(engine.getState()).toBe("CANDIDATE_TILT_RIGHT");
      expect(firedGestures).toHaveLength(0);

      now += 70;
      engine.processGyroscope({ x: 0, y: 3.0, z: 0 }, now);

      expect(firedGestures).toEqual(["NEXT"]);
      expect(engine.getState()).toBe("LOCKED");
    });

    it("rejects tilt when device is facing face-down (gz <= 0.1)", () => {
      let now = 1000;
      for (let i = 0; i < 3; i++) {
        engine.processAccelerometer({ x: 0, y: 0, z: -1.0 }, now);
      }

      engine.processGyroscope({ x: 0, y: 3.0, z: 0 }, now);
      expect(engine.getState()).toBe("IDLE");
      expect(firedGestures).toHaveLength(0);
    });
  });

  describe("Tilt Left (PREVIOUS)", () => {
    it("fires PREVIOUS when roll angular velocity is below threshold with screen facing upward", () => {
      let now = 1000;
      for (let i = 0; i < 3; i++) {
        engine.processAccelerometer({ x: 0, y: 0, z: 1.0 }, now);
      }

      engine.processGyroscope({ x: 0, y: -3.0, z: 0 }, now);
      expect(engine.getState()).toBe("CANDIDATE_TILT_LEFT");
      expect(firedGestures).toHaveLength(0);

      now += 70;
      engine.processGyroscope({ x: 0, y: -3.0, z: 0 }, now);

      expect(firedGestures).toEqual(["PREVIOUS"]);
      expect(engine.getState()).toBe("LOCKED");
    });
  });

  describe("Return-to-Neutral Re-Arming Cycle", () => {
    it("prevents duplicate fires until device returns to neutral and cools down", () => {
      let now = 1000;
      for (let i = 0; i < 3; i++) {
        engine.processAccelerometer({ x: 0, y: 0, z: 1.0 }, now);
      }

      engine.processGyroscope({ x: 0, y: 3.0, z: 0 }, now);
      now += 70;
      engine.processGyroscope({ x: 0, y: 3.0, z: 0 }, now);
      expect(firedGestures).toEqual(["NEXT"]);
      expect(engine.getState()).toBe("LOCKED");

      now += 100;
      engine.processGyroscope({ x: 0, y: 3.0, z: 0 }, now);
      expect(firedGestures).toHaveLength(1);
      expect(engine.getState()).toBe("LOCKED");

      now += 50;
      for (let i = 0; i < 3; i++) {
        engine.processGyroscope({ x: 0, y: 0.1, z: 0 }, now);
      }
      expect(engine.getState()).toBe("COOLDOWN");

      now += 100;
      engine.processGyroscope({ x: 0, y: 0.1, z: 0 }, now);
      expect(engine.getState()).toBe("COOLDOWN");

      now += 300;
      engine.processGyroscope({ x: 0, y: 0.1, z: 0 }, now);
      expect(engine.getState()).toBe("IDLE");

      now += 20;
      for (let i = 0; i < 3; i++) {
        engine.processGyroscope({ x: 0, y: 3.0, z: 0 }, now);
      }
      now += 70;
      for (let i = 0; i < 3; i++) {
        engine.processGyroscope({ x: 0, y: 3.0, z: 0 }, now);
      }
      expect(firedGestures).toEqual(["NEXT", "NEXT"]);
    });
  });

  describe("Shake Detection (SHAKE)", () => {
    function settleEngine(now = 1000) {
      for (let i = 0; i < 22; i++) {
        engine.processGyroscope({ x: 0, y: 0, z: 0 }, now);
        engine.processAccelerometer({ x: 0, y: 0, z: 1 }, now);
        now += 20;
      }
      return now;
    }

    function sample(
      now: number,
      accelX: number,
      gyroY: number,
      accelY = 0,
      accelZ = 1,
    ) {
      engine.processGyroscope({ x: 0, y: gyroY, z: 0 }, now);
      engine.processAccelerometer({ x: accelX, y: accelY, z: accelZ }, now);
    }

    function performShake(now: number) {
      sample(now, 1.5, 1.2);
      sample(now + 40, 0, 0);
      sample(now + 80, -1.5, -1.2);
      sample(now + 120, 0, 0);
      sample(now + 160, 1.5, 1.2);
      return now + 180;
    }

    it("fires once for a three-peak same-axis wrist shake with gyro motion", () => {
      const now = settleEngine();
      performShake(now);

      expect(firedGestures).toEqual(["SHAKE"]);
      expect(engine.getState()).toBe("LOCKED");
    });

    it("treats sustained samples as one physical peak until acceleration releases", () => {
      const now = settleEngine();
      sample(now, 1.5, 1.2);
      sample(now + 20, 1.7, 1.2);
      sample(now + 40, 0, 0);
      sample(now + 80, -1.5, -1.2);
      sample(now + 100, -1.7, -1.2);
      sample(now + 120, 0, 0);
      sample(now + 160, 1.5, 1.2);

      expect(firedGestures).toEqual(["SHAKE"]);
    });

    it("rejects vibration-like alternating acceleration without rotational motion", () => {
      let now = settleEngine();
      for (let i = 0; i < 10; i++) {
        sample(now, i % 2 === 0 ? 1.2 : -1.2, 0.05);
        now += 20;
      }

      expect(firedGestures).toHaveLength(0);
    });

    it("rejects two peaks, cross-axis reversals, and stale peaks", () => {
      let now = settleEngine();
      sample(now, 1.5, 1.2);
      sample(now + 40, 0, 0);
      sample(now + 80, -1.5, -1.2);
      expect(firedGestures).toHaveLength(0);

      engine.reset();
      now = settleEngine(now + 200);
      sample(now, 1.5, 1.2);
      sample(now + 40, 0, 0);
      sample(now + 80, 0, -1.2, -1.5);
      sample(now + 120, 0, 0);
      sample(now + 160, 0, 1.2, 1.5);
      expect(firedGestures).toHaveLength(0);

      engine.reset();
      now = settleEngine(now + 200);
      sample(now, 1.5, 1.2);
      sample(now + 40, 0, 0);
      sample(now + 300, -1.5, -1.2);
      sample(now + 340, 0, 0);
      sample(now + 600, 1.5, 1.2);
      expect(firedGestures).toHaveLength(0);
    });

    it("does not treat accelerometer values above 4g as metres per second squared", () => {
      const now = settleEngine();
      sample(now, 5, 1.2);
      sample(now + 80, -5, -1.2);
      sample(now + 160, 5, 1.2);

      expect(firedGestures).toEqual(["SHAKE"]);
    });

    it("suppresses feedback motion and only re-arms after cooldown and neutral settling", () => {
      let now = settleEngine();
      now = performShake(now);
      expect(firedGestures).toEqual(["SHAKE"]);

      engine.suppressShakeFor(650, now);
      for (let i = 0; i < 10; i++) {
        sample(now, i % 2 === 0 ? 1.5 : -1.5, 0.05);
        now += 20;
      }
      expect(firedGestures).toEqual(["SHAKE"]);

      for (let i = 0; i < 60; i++) {
        sample(now, 0, 0);
        now += 20;
      }
      performShake(now);

      expect(firedGestures).toEqual(["SHAKE", "SHAKE"]);
    });
  });
});
