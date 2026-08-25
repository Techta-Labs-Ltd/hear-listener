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
        shakeThresholdG: 0.45,
        shakeWindowMs: 650,
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
    it("fires SHAKE on small wrist shake with directional sign inversion", () => {
      let now = 1000;

      // Settle gravity
      for (let i = 0; i < 5; i++) {
        engine.processAccelerometer({ x: 0, y: 0, z: 1.0 }, now);
        now += 20;
      }

      // Small shake: +0.6g on X, then -0.6g on X
      engine.processAccelerometer({ x: 0.6, y: 0, z: 1.0 }, now);
      now += 80;
      engine.processAccelerometer({ x: -0.6, y: 0, z: 1.0 }, now);

      expect(firedGestures).toEqual(["SHAKE"]);
      expect(engine.getState()).toBe("LOCKED");
    });

    it("re-arms to IDLE after cooldown and device settles", () => {
      let now = 1000;

      for (let i = 0; i < 5; i++) {
        engine.processAccelerometer({ x: 0, y: 0, z: 1.0 }, now);
        now += 20;
      }

      engine.processAccelerometer({ x: 0.6, y: 0, z: 1.0 }, now);
      now += 80;
      engine.processAccelerometer({ x: -0.6, y: 0, z: 1.0 }, now);

      expect(firedGestures).toEqual(["SHAKE"]);
      expect(engine.getState()).toBe("LOCKED");

      now += 400;
      for (let i = 0; i < 5; i++) {
        engine.processAccelerometer({ x: 0, y: 0, z: 1.0 }, now);
        now += 20;
      }
      expect(engine.getState()).toBe("IDLE");
    });

    it("ignores single-direction continuous acceleration without reversal", () => {
      let now = 1000;

      for (let i = 0; i < 5; i++) {
        engine.processAccelerometer({ x: 0, y: 0, z: 1.0 }, now);
        now += 20;
      }

      engine.processAccelerometer({ x: 0.6, y: 0, z: 1.0 }, now);
      now += 80;
      engine.processAccelerometer({ x: 0.6, y: 0, z: 1.0 }, now);
      now += 80;
      engine.processAccelerometer({ x: 0.6, y: 0, z: 1.0 }, now);

      expect(firedGestures).toHaveLength(0);
    });
  });
});
