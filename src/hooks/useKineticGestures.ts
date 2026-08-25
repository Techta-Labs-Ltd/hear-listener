import { useCallback, useEffect, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { useKinetic } from "@/providers/KineticProvider";
import type { KineticGestureListener } from "@/types";

export function useKineticGestures(listener: KineticGestureListener) {
  const { registerKineticHandler, enabled } = useKinetic();
  const listenerRef = useRef(listener);

  useEffect(() => {
    listenerRef.current = listener;
  }, [listener]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;

      const unregister = registerKineticHandler({
        onNext: () => listenerRef.current.onNext?.(),
        onPrevious: () => listenerRef.current.onPrevious?.(),
        onShake: () => listenerRef.current.onShake?.(),
      });

      return () => {
        unregister();
      };
    }, [enabled, registerKineticHandler]),
  );
}
