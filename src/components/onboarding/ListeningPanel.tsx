import { AppText } from "@/components/ui/AppText";
import { colors } from "@/constants/theme";
import { VOICE_TIMING } from "@/constants/voice";
import { useAppAccessibility } from "@/providers/AccessibilityProvider";
import { View } from "@/tw";
import type { ListeningPanelProps, VoiceState } from "@/types";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VoiceStatusBadge } from "./VoiceStatusBadge";

type PanelPhase = "initializing" | "listening" | "working";

function phaseFor(state: VoiceState): PanelPhase {
  if (state === "listening") return "listening";
  if (state === "resolving" || state === "executing" || state === "clarifying")
    return "working";
  return "initializing";
}

const phaseCopy: Record<PanelPhase, { badge: string; title: string; sub: string }> = {
  initializing: {
    badge: "GETTING READY",
    title: "Getting everything ready.",
    sub: "Hear asks for microphone access first. Your phone owns the dialog.",
  },
  listening: {
    badge: "LISTENING",
    title: "Speak naturally.",
    sub: "I’ll show what I heard, then find your news.",
  },
  working: {
    badge: "ONE MOMENT",
    title: "Working on that.",
    sub: "Finding the best match.",
  },
};

export function ListeningPanel({ state, message }: ListeningPanelProps) {
  const insets = useSafeAreaInsets();
  const { reduceMotionEnabled } = useAppAccessibility();
  const phase = phaseFor(state);
  const copy = phaseCopy[phase];
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (phase !== "listening") {
      progress.setValue(0);
      return;
    }
    if (reduceMotionEnabled) {
      progress.setValue(0.34);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: VOICE_TIMING.noSpeechTimeout,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [phase, progress, reduceMotionEnabled]);

  return (
    <LinearGradient
      colors={[colors.voiceCanvas, colors.voicePanel]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{
        flexGrow: 1,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: insets.bottom + 20,
      }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="mt-3 h-1 w-[76px] self-center rounded-full bg-voice-muted opacity-65"
      />
      <View className="mt-7 px-6">
        <VoiceStatusBadge label={copy.badge} />
        <AppText
          accessibilityLiveRegion="polite"
          className="mt-[30px] font-display text-[39px] leading-[47px] text-white"
        >
          {copy.title}
        </AppText>
        <AppText className="mt-[15px] text-[17px] leading-[21px] text-voice-muted">
          {message && phase === "working" ? message : copy.sub}
        </AppText>
        {phase === "listening" ? (
          <>
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Listening time before the session closes"
              className="mt-[46px] h-1 overflow-hidden rounded-full bg-voice-track"
            >
              <Animated.View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                className="h-full rounded-full bg-voice-indicator"
                style={{
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                }}
              />
            </View>
            <AppText className="mt-[21px] text-sm leading-[17px] text-voice-muted">
              No speech: a gentle reminder at 4 seconds.
            </AppText>
            <AppText className="mt-[10px] text-sm leading-[17px] text-voice-muted">
              Closes at 8 seconds and returns here.
            </AppText>
          </>
        ) : null}
        <View className="mt-[45px] border-t border-voice-track pt-[19px]">
          <AppText className="font-body-bold text-[15px] leading-[18px] text-white">
            Say “cancel” to stop.
          </AppText>
          <AppText className="mt-[16px] text-[13px] leading-4 text-voice-muted">
            After timeout, double-tap anywhere to listen again.
          </AppText>
        </View>
      </View>
    </LinearGradient>
  );
}
