import { createKineticGestureProxy } from "@/utils/kinetic-listener";

describe("createKineticGestureProxy", () => {
  it("does not create a fake shake handler for next/previous-only screens", () => {
    const proxy = createKineticGestureProxy(() => ({
      onNext: jest.fn(),
      onPrevious: jest.fn(),
    }));

    expect(proxy.onNext).toBeDefined();
    expect(proxy.onPrevious).toBeDefined();
    expect(proxy.onShake).toBeUndefined();
  });

  it("preserves an explicit screen shake handler", () => {
    const onShake = jest.fn();
    const proxy = createKineticGestureProxy(() => ({ onShake }));

    proxy.onShake?.();

    expect(onShake).toHaveBeenCalledTimes(1);
  });
});
