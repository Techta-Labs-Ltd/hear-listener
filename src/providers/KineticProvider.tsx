import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState, Platform, Pressable, Text, View } from "react-native";
import { Accelerometer, Gyroscope } from "expo-sensors";
import { KineticGestureEngine } from "@/services/kinetic/kinetic-engine";
import { triggerKineticFeedback } from "@/services/kinetic/kinetic-feedback";
import { ShakeDispatchGate } from "@/services/kinetic/kinetic-dispatch-guard";
import { subscribeToKineticInterference } from "@/services/kinetic/kinetic-interference";
import type {
  KineticContextValue,
  KineticGestureListener,
  KineticGestureType,
} from "@/types";
import { usePreferencesStore } from "@/stores/preferences-store";
import { useKineticStore } from "@/stores/kinetic-store";
import { useExternalVoiceStore } from "@/stores/external-voice-store";
import { useVoiceStore } from "@/stores/voice-store";
import { ukSpeech } from "@/services/voice/speech";
import { triggerVoice } from "@/services/voice/events";
import { DEFAULT_KINETIC_CONFIG } from "@/constants/kinetic";
import { onboardingVoiceBridge } from "@/stores/onboarding-voice-store";

import { ambiguityController } from "@/services/voice/ambiguity-controller";

export const KineticContext = createContext<KineticContextValue | null>(null);

function sensorTimestampMs(timestamp?: number): number {
  return typeof timestamp === "number" && Number.isFinite(timestamp) && timestamp > 0
    ? timestamp * 1000
    : Date.now();
}

export function useKinetic(): KineticContextValue {
  const ctx = useContext(KineticContext);
  if (!ctx) {
    throw new Error("useKinetic must be used within a KineticProvider");
  }
  return ctx;
}

export function KineticProvider({
  children,
  active = true,
}: PropsWithChildren<{ active?: boolean }>) {
  const kineticGesturesEnabled = usePreferencesStore(
    (state) => state.kineticGesturesEnabled ?? true,
  );
  const setupComplete = usePreferencesStore((state) => state.setupComplete);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );

  const engineRef = useRef<KineticGestureEngine | null>(null);
  const [shakeDispatchGate] = useState(() => new ShakeDispatchGate());

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
        if (!shakeDispatchGate.begin()) {
          return;
        }

        const isResolving =
          useExternalVoiceStore.getState().status === "resolving" ||
          voiceState.state === "resolving";
        const isBusy =
          isResolving ||
          voiceState.state === "listening" ||
          voiceState.state === "executing" ||
          voiceState.state === "preparing";

        if (isBusy) {
          shakeDispatchGate.end();
          return;
        }

        try {
          void ukSpeech.stop();
          void triggerKineticFeedback("SHAKE", "Voice command");

          const currentVoiceState = useVoiceStore.getState();
          const stillBusy =
            useExternalVoiceStore.getState().status === "resolving" ||
            ["listening", "executing", "preparing", "resolving"].includes(
              currentVoiceState.state,
            );
          if (stillBusy) {
            return;
          }

          const onboardingGestureMode = onboardingVoiceBridge.reportGesture();
          if (onboardingGestureMode !== "inactive") {
            return;
          }

          if (!onboardingVoiceBridge.isVoiceInvocationAllowed()) {
            return;
          }

          if (listener?.onShake) {
            await listener.onShake();
          } else {
            triggerVoice("shakeGesture", true);
          }
        } finally {
          shakeDispatchGate.end();
        }
      }
    },
    [shakeDispatchGate],
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
    if (!setupComplete) return;
    onboardingVoiceBridge.setGestureMode("inactive");
    onboardingVoiceBridge.setVoiceInvocationAllowed(true);
  }, [setupComplete]);

  useEffect(() => {
    return subscribeToKineticInterference((durationMs) => {
      engineRef.current?.suppressShakeFor(durationMs);
    });
  }, []);

  useEffect(() => {
    return () => {
      shakeDispatchGate.reset();
    };
  }, [shakeDispatchGate]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!active || !kineticGesturesEnabled) {
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
          engineRef.current?.processGyroscope(data, sensorTimestampMs(data.timestamp));
        });

        accelSub = Accelerometer.addListener((data) => {
          engineRef.current?.processAccelerometer(
            data,
            sensorTimestampMs(data.timestamp),
          );
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
  }, [active, kineticGesturesEnabled]);

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
    <KineticContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        {__DEV__ ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Test shake gesture"
            accessibilityHint="Runs the development shake-to-voice test"
            onPress={() => void handleGesture("SHAKE")}
            style={{
              position: "absolute",
              right: 16,
              top: 64,
              zIndex: 9999,
              borderRadius: 999,
              backgroundColor: "#3E1475",
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
              Test shake
            </Text>
          </Pressable>
        ) : null}
      </View>
    </KineticContext.Provider>
  );
}
