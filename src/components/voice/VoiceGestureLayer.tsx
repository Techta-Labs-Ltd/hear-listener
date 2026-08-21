import { useMemo, type PropsWithChildren } from "react";
import { View } from "@/tw";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useVoice } from "@/hooks/useVoice";
import { useAppAccessibility } from "@/providers/AccessibilityProvider";
import { speechCoordinator } from "@/services/voice/speech-coordinator";
import { onboardingVoiceBridge } from "@/stores/onboarding-voice-store";
import * as Haptics from "expo-haptics";
import { playClick } from "@/lib/audio/one-shots";

const INVOCABLE_STATES = new Set([
  "idle",
  "success",
  "error",
  "cancelled",
]);

export function VoiceGestureLayer({ children }: PropsWithChildren) {
  const { state, startVoiceSession, stop } = useVoice();
  const { screenReaderEnabled } = useAppAccessibility();

  const singleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(1)
        .runOnJS(true)
        .onEnd((_event, success) => {
          if (!success) return;
          void speechCoordinator.cancel();
        }),
    [],
  );

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(500)
        .maxDelay(400)
        .enabled(!screenReaderEnabled)
        .runOnJS(true)
        .onEnd((_event, success) => {
          if (!success) return;
          void speechCoordinator.cancel();
          if (state === "listening") {
            void playClick();
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            stop();
            return;
          }
          if (!INVOCABLE_STATES.has(state)) return;
          const onboardingMode = onboardingVoiceBridge.reportGesture();
          if (onboardingMode !== "inactive") {
            void playClick();
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            return;
          }
          void playClick();
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          void startVoiceSession({
            source: "doubleTap",
          });
        }),
    [screenReaderEnabled, startVoiceSession, state, stop],
  );

  const composedGesture = useMemo(
    () => Gesture.Exclusive(doubleTap, singleTap),
    [doubleTap, singleTap],
  );

  return (
    <GestureDetector gesture={composedGesture}>
      <View
        collapsable={false}
        className="flex-1"
        accessibilityActions={[
          { name: "startVoiceCommand", label: "Start voice command" },
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "startVoiceCommand") {
            void speechCoordinator.cancel();
            const onboardingMode = onboardingVoiceBridge.reportGesture();
            if (onboardingMode !== "inactive") {
              void playClick();
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              return;
            }
            void startVoiceSession({
              source: "accessibilityAction",
            });
          }
        }}
      >
        {children}
      </View>
    </GestureDetector>
  );
}
