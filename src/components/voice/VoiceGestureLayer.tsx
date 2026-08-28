import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { useVoice } from "@/hooks/useVoice";
import { speechCoordinator } from "@/services/voice/speech-coordinator";
import { onboardingVoiceBridge } from "@/stores/onboarding-voice-store";
import { playClick } from "@/lib/audio/one-shots";
import { appHaptics } from "@/lib/haptics";

export function VoiceGestureLayer({ children }: PropsWithChildren) {
  const { startVoiceSession } = useVoice();

  return (
    <View
      collapsable={false}
      style={{ flex: 1 }}
      accessibilityActions={[
        { name: "startVoiceCommand", label: "Start voice command" },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "startVoiceCommand") {
          void speechCoordinator.cancel();
          const onboardingMode = onboardingVoiceBridge.reportGesture();
          if (onboardingMode !== "inactive") {
            void playClick();
            void appHaptics.success();
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
  );
}
