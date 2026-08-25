import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type PropsWithChildren,
} from "react";
import { AppState, Platform } from "react-native";
import { Accelerometer, Gyroscope } from "expo-sensors";
import { KineticGestureEngine } from "@/services/kinetic/kinetic-engine";
import { triggerKineticFeedback } from "@/services/kinetic/kinetic-feedback";
import type {
  KineticContextValue,
  KineticGestureListener,
  KineticGestureType,
} from "@/types";
import { usePreferencesStore } from "@/stores/preferences-store";
import { useKineticStore } from "@/stores/kinetic-store";
import { useVoiceStore } from "@/stores/voice-store";
import { ukSpeech } from "@/services/voice/speech";
import { triggerVoice } from "@/services/voice/events";
import { DEFAULT_KINETIC_CONFIG } from "@/constants/kinetic";

import { ambiguityController } from "@/services/voice/ambiguity-controller";

export const KineticContext = createContext<KineticContextValue | null>(null);

export function useKinetic(): KineticContextValue {
  const ctx = useContext(KineticContext);
  if (!ctx) {
    throw new Error("useKinetic must be used within a KineticProvider");
  }
  return ctx;
}

export function KineticProvider({ children }: PropsWithChildren) {
  const kineticGesturesEnabled = usePreferencesStore(
    (state) => state.kineticGesturesEnabled ?? true,
  );
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );

  const engineRef = useRef<KineticGestureEngine | null>(null);

  const handleGesture = useCallback(
    async (gesture: KineticGestureType) => {
      useKineticStore.getState().setLastGesture(gesture);
      const listener = useKineticStore.getState().activeListener;
      const voiceState = useVoiceStore.getState();

      if (gesture === "NEXT") {
        await triggerKineticFeedback("NEXT", "Next");
        if (voiceState.state === "clarifying") {
          ambiguityController.next();
        } else if (listener?.onNext) {
          void listener.onNext();
        }
      } else if (gesture === "PREVIOUS") {
        await triggerKineticFeedback("PREVIOUS", "Previous");
        if (voiceState.state === "clarifying") {
          ambiguityController.previous();
        } else if (listener?.onPrevious) {
          void listener.onPrevious();
        }
      } else if (gesture === "SHAKE") {
        const isResolving =
          voiceState.externalResolving ||
          voiceState.externalStatus === "resolving" ||
          voiceState.state === "resolving";
        const isBusy =
          isResolving ||
          voiceState.state === "listening" ||
          voiceState.state === "executing" ||
          voiceState.state === "preparing";

        if (isBusy) {
          return;
        }

        void ukSpeech.stop();
        await triggerKineticFeedback("SHAKE", "Voice command");
        if (listener?.onShake) {
          void listener.onShake();
        } else {
          triggerVoice("contextualAction", true);
        }
      }
    },
    [],
  );

  if (engineRef.current == null) {
    engineRef.current = new KineticGestureEngine(
      DEFAULT_KINETIC_CONFIG,
      handleGesture,
      (state) => useKineticStore.getState().setEngineState(state),
    );
  }

  useEffect(() => {
    engineRef.current?.setOnGesture(handleGesture);
    engineRef.current?.setOnStateChange((state) =>
      useKineticStore.getState().setEngineState(state),
    );
  }, [handleGesture]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!kineticGesturesEnabled) {
      engineRef.current?.reset();
      return;
    }

    let isSubscribed = false;
    let gyroSub: { remove: () => void } | null = null;
    let accelSub: { remove: () => void } | null = null;

    const startSensors = () => {
      if (isSubscribed) return;
      isSubscribed = true;
      engineRef.current?.reset();

      try {
        Gyroscope.setUpdateInterval(DEFAULT_KINETIC_CONFIG.samplingIntervalMs);
        Accelerometer.setUpdateInterval(DEFAULT_KINETIC_CONFIG.samplingIntervalMs);

        gyroSub = Gyroscope.addListener((data) => {
          engineRef.current?.processGyroscope(data);
        });

        accelSub = Accelerometer.addListener((data) => {
          engineRef.current?.processAccelerometer(data);
        });
      } catch {}
    };

    const stopSensors = () => {
      if (!isSubscribed) return;
      isSubscribed = false;
      try {
        gyroSub?.remove();
        accelSub?.remove();
      } catch {}
      gyroSub = null;
      accelSub = null;
      engineRef.current?.reset();
    };

    if (AppState.currentState === "active") {
      startSensors();
    }

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        startSensors();
      } else {
        stopSensors();
      }
    });

    return () => {
      stopSensors();
      appStateSub.remove();
    };
  }, [kineticGesturesEnabled]);

  const registerKineticHandler = useCallback(
    (listener: KineticGestureListener) => {
      return useKineticStore.getState().registerListener(listener);
    },
    [],
  );

  const setEnabled = useCallback(
    (enabled: boolean) => {
      updatePreferences({ kineticGesturesEnabled: enabled });
    },
    [updatePreferences],
  );

  const value = useMemo<KineticContextValue>(
    () => ({
      registerKineticHandler,
      enabled: kineticGesturesEnabled,
      setEnabled,
    }),
    [registerKineticHandler, kineticGesturesEnabled, setEnabled],
  );

  return (
    <KineticContext.Provider value={value}>{children}</KineticContext.Provider>
  );
}
