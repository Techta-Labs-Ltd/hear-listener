import type { KineticGestureListener } from "@/types";

export function createKineticGestureProxy(
  getListener: () => KineticGestureListener,
): KineticGestureListener {
  const listener = getListener();
  const proxy: KineticGestureListener = {};

  if (listener.onNext) {
    proxy.onNext = () => getListener().onNext?.();
  }
  if (listener.onPrevious) {
    proxy.onPrevious = () => getListener().onPrevious?.();
  }
  if (listener.onShake) {
    proxy.onShake = () => getListener().onShake?.();
  }

  return proxy;
}
