import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { VoiceSessionSurface } from "./VoiceSessionSurface";
import { useVoice } from "@/hooks/useVoice";
import { AmbiguityChoices } from "./AmbiguityChoices";

export function VoiceOverlay() {
  const voice = useVoice();
  if (voice.state === "idle") return null;

  const cancel = voice.state === "listening" || voice.state === "preparing"
    ? voice.cancel
    : voice.close;

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(180)}
      className="absolute inset-0 z-[100]"
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
  );
}
