import { PermissionDeniedView } from "@/features/settings/screens/PermissionDeniedView";
import { useVoice } from "@/hooks/useVoice";
import { usePathname } from "expo-router";
import { Pressable } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { AmbiguityChoices } from "./AmbiguityChoices";
import { VoiceSessionSurface } from "./VoiceSessionSurface";

export function VoiceOverlay() {
  const voice = useVoice();
  const pathname = usePathname();
  if (voice.state === "idle" || pathname === "/onboarding") return null;

  if (voice.state === "error" && voice.errorCode === "permission-denied") {
    return (
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(180)}
        className="absolute inset-0 z-[100]"
      >
        <PermissionDeniedView
          onBack={voice.close}
          onContinueWithoutVoice={voice.close}
        />
      </Animated.View>
    );
  }

  const cancel =
    voice.state === "listening" || voice.state === "preparing"
      ? voice.cancel
      : voice.close;

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(180)}
      className="absolute inset-0 z-[100] justify-end"
    >

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss voice sheet"
        accessibilityHint="Closes voice control and returns to screen."
        onPress={cancel}
        className="absolute inset-0 bg-black/40"
      />

      <Animated.View
        entering={SlideInDown.duration(240).damping(18)}
        exiting={SlideOutDown.duration(200)}
        className="w-full max-w-[560px] self-center"
      >
        <VoiceSessionSurface
          state={voice.state}
          message={voice.message || "Preparing voice control."}
          transcript={voice.transcript}
          onCancel={cancel}
          onRetry={voice.retry}
        >
          {voice.state === "clarifying" ? <AmbiguityChoices /> : null}
        </VoiceSessionSurface>
      </Animated.View>
    </Animated.View>
  );
}
