import { ShakeDispatchGate } from "@/services/kinetic/kinetic-dispatch-guard";

describe("ShakeDispatchGate", () => {
  it("releases an interrupted shake dispatch during provider cleanup", () => {
    const gate = new ShakeDispatchGate();

    expect(gate.begin()).toBe(true);
    expect(gate.begin()).toBe(false);

    gate.reset();

    expect(gate.begin()).toBe(true);
  });
});
