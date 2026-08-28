type KineticInterferenceListener = (durationMs: number) => void;

const listeners = new Set<KineticInterferenceListener>();

export function suppressKineticShakeFor(durationMs: number): void {
  for (const listener of listeners) {
    listener(durationMs);
  }
}

export function subscribeToKineticInterference(
  listener: KineticInterferenceListener,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
