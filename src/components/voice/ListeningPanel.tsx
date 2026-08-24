import { AppText } from "@/components/ui/AppText";
import { colors } from "@/constants/theme";
import { VOICE_TIMING } from "@/constants/voice";
import { useAppAccessibility } from "@/providers/AccessibilityProvider";
import { View } from "@/tw";
import type { ListeningPanelProps, PanelPhase, VoiceState } from "@/types";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ListeningCountdown } from "./ListeningCountdown";
import { VoiceStatusBadge } from "./VoiceStatusBadge";

function phaseFor(state: VoiceState): PanelPhase {
  if (state === "listening") return "listening";
  if (state === "resolving" || state === "executing" || state === "clarifying")
    return "working";
  return "initializing";
}

export function ListeningPanel({
  state,
  message,
  prompt,
  transcript,
  deadlineAt,
  speechDetected,
}: ListeningPanelProps) {
  const insets = useSafeAreaInsets();
  const { reduceMotionEnabled } = useAppAccessibility();
  const isError = state === "error" || state === "cancelled";
  const isListening = state === "listening";
  const isWorking =
    state === "resolving" || state === "executing" || state === "clarifying";
  const phase = phaseFor(state);

  const copy = isError
    ? {
      badge: "TRY AGAIN",
      title: transcript ? `“${transcript}”` : "I didn’t hear that.",
      sub: message || prompt || "Shake device to speak again.",
    }
    : isWorking
      ? {
        badge: "ONE MOMENT",
        title: transcript ? `“${transcript}”` : "Working on that.",
        sub: message || "Finding your news…",
      }
      : isListening
        ? {
          badge: "LISTENING",
          title: transcript ? `“${transcript}”` : "Speak naturally.",
          sub: transcript
            ? "Checking what you said…"
            : prompt || "Say “Play my local news.”",
        }
        : {
          badge: "GETTING READY",
          title: "Getting everything ready.",
          sub: prompt || message || "Say “Play my local news.”",
        };

  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (phase !== "listening" || isError || speechDetected) {
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
  }, [isError, phase, progress, reduceMotionEnabled, speechDetected]);

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
        className="mt-3 h-1 w-[64px] self-center rounded-full bg-voice-muted opacity-65"
      />
      <View className="mt-4 sm:mt-7 px-5 sm:px-6">
        <View className="flex-row items-center justify-between">
          <VoiceStatusBadge label={copy.badge} />
          {phase === "listening" && !isError && !speechDetected && (
            <ListeningCountdown
              deadlineAt={deadlineAt}
              speechDetected={speechDetected}
              size={30}
              strokeWidth={2.5}
            />
          )}
        </View>

        <AppText
          accessibilityLiveRegion="polite"
          className="mt-4 sm:mt-[28px] font-display text-[32px] sm:text-[38px] leading-[36px] sm:leading-[44px] text-white"
        >
          {transcript && (phase === "working" || speechDetected || isError)
            ? `“${transcript}”`
            : copy.title}
        </AppText>
        <AppText className="mt-2 sm:mt-[12px] text-[15px] sm:text-[16px] leading-[20px] sm:leading-[21px] text-voice-muted">
          {message || prompt || copy.sub}
        </AppText>

        {phase === "listening" && !isError && !speechDetected ? (
          <>
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Listening time before the session closes"
              style={{
                marginTop: 20,
                height: 6,
                width: "100%",
                backgroundColor: colors.voiceTrack,
                borderRadius: 9999,
                overflow: "hidden",
              }}
            >
              <Animated.View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={{
                  height: "100%",
                  backgroundColor: colors.voiceIndicator,
                  borderRadius: 9999,
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                }}
              />
            </View>
            <AppText className="mt-3 sm:mt-[16px] text-[13px] sm:text-sm leading-[16px] sm:leading-[17px] text-voice-muted">
              No speech: a gentle reminder at 4 seconds.
            </AppText>
            <AppText className="mt-1.5 sm:mt-[8px] text-[13px] sm:text-sm leading-[16px] sm:leading-[17px] text-voice-muted">
              Closes at 8 seconds and returns here.
            </AppText>
          </>
        ) : null}

        <View className="mt-5 sm:mt-[32px] border-t border-voice-track pt-4 sm:pt-[20px]">
          <AppText className="font-body-bold text-[16px] sm:text-[18px] leading-[20px] text-white">
            {isError ? (prompt || "Say “Play my local news.”") : "Say “cancel” to stop."}
          </AppText>
          <AppText className="mt-1.5 sm:mt-[10px] text-[13px] sm:text-[14px] leading-4 text-voice-muted">
            Shake device to speak again.
          </AppText>
        </View>
      </View>
    </LinearGradient>
  );
}
