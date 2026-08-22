import {
  ActivityIndicator,
  Animated as NativeAnimated,
  BackHandler,
  Easing,
  Linking,
  Platform,
  Pressable,
} from "react-native";
import { useEffect, useState } from "react";
import { usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { VOICE_TIMING } from "@/constants/voice";
import { useVoice } from "@/hooks/useVoice";
import { View } from "@/tw";
import type { VoiceChoice, VoiceState } from "@/types";
import { ListeningCountdown } from "./ListeningCountdown";
import { VoiceStatusBadge } from "./VoiceStatusBadge";

const stateBadges: Record<VoiceState, string> = {
  idle: "VOICE READY",
  permission: "CHECKING ACCESS",
  preparing: "GETTING READY",
  listening: "LISTENING",
  resolving: "I HEARD",
  clarifying: "ONE MORE THING",
  executing: "WORKING ON THAT",
  success: "DONE",
  error: "I DIDN’T HEAR A COMMAND",
  cancelled: "VOICE CLOSED",
};

export function GlobalVoiceDock() {
  const voice = useVoice();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isVoiceOpen = voice.state !== "idle" && pathname !== "/onboarding";
  const listening = voice.state === "listening";
  const resolving = voice.state === "resolving" || voice.state === "executing";
  const clarifying = voice.state === "clarifying";
  const failed = voice.state === "error";
  const isPermissionDenied = failed && voice.errorCode === "permission-denied";

  const [progress] = useState(() => new NativeAnimated.Value(0));

  useEffect(() => {
    if (!listening || voice.speechDetected) {
      progress.setValue(0);
      return;
    }
    progress.setValue(0);
    const animation = NativeAnimated.timing(progress, {
      toValue: 1,
      duration: VOICE_TIMING.noSpeechTimeout,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [listening, progress, voice.speechDetected]);

  const cancel =
    listening || voice.state === "preparing" ? voice.cancel : voice.close;

  useEffect(() => {
    if (!isVoiceOpen || Platform.OS !== "android") return;
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        cancel();
        return true;
      },
    );
    return () => backHandler.remove();
  }, [isVoiceOpen, cancel]);

  if (!isVoiceOpen) return null;

  const isBackdropDismissible = failed || voice.state === "cancelled";

  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(160)}
      className="absolute inset-0 z-[9999] justify-end"
      style={{ pointerEvents: "box-none" }}
    >
      <Pressable
        accessibilityRole={isBackdropDismissible ? "button" : undefined}
        accessibilityLabel={isBackdropDismissible ? "Dismiss voice control" : undefined}
        accessibilityHint={isBackdropDismissible ? "Closes voice control and returns to the current screen." : undefined}
        onPress={isBackdropDismissible ? cancel : undefined}
        className="absolute inset-0 bg-black/40"
      />

      <Animated.View
        entering={SlideInDown.duration(240).damping(18)}
        exiting={SlideOutDown.duration(200)}
        className="w-full max-w-[560px] self-center"
      >
        <View
          className="w-full overflow-hidden rounded-t-[32px] bg-[#21102F] px-6 pt-3 shadow-2xl"
          style={{
            paddingBottom: Math.max(insets.bottom + 16, 28),
            borderTopWidth: 1,
            borderColor: "rgba(217, 203, 237, 0.15)",
          }}
        >
          <StatusBar style="light" />

          <View className="items-center pb-2">
            <View className="h-1 w-[76px] rounded-full bg-[#D9CBED] opacity-65" />
          </View>

          <View className="flex-row items-center justify-between pb-3 pt-1">
            <VoiceStatusBadge
              label={
                isPermissionDenied
                  ? "PERMISSION REQUIRED"
                  : listening && voice.speechDetected
                    ? "I CAN HEAR YOU"
                    : stateBadges[voice.state]
              }
            />

            <View className="flex-row items-center gap-3">
              {listening && !voice.speechDetected && (
                <ListeningCountdown
                  deadlineAt={voice.listeningDeadlineAt}
                  speechDetected={voice.speechDetected}
                  size={30}
                  strokeWidth={2.5}
                />
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  listening ? "Stop listening" : "Cancel voice session"
                }
                accessibilityHint="Closes voice control."
                onPress={cancel}
                hitSlop={8}
                className="min-h-11 items-center justify-center rounded-xl px-3 active:bg-white/10"
              >
                <AppText className="font-body-semibold text-[14px] text-white">
                  {listening ? "Stop" : "Cancel"}
                </AppText>
              </Pressable>
            </View>
          </View>

          <View className="gap-3 pb-3">
            {isPermissionDenied ? (
              <>
                <AppText
                  accessibilityRole="header"
                  className="font-display text-[26px] leading-[32px] text-white"
                >
                  Microphone access needed
                </AppText>
                <AppText className="text-[14px] leading-5 text-voice-muted">
                  Allow microphone access in Settings to use voice control.
                </AppText>
                <View className="mt-2 flex-row items-center gap-3">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open Settings"
                    accessibilityHint="Opens system settings."
                    onPress={() => void Linking.openSettings()}
                    className="min-h-12 flex-1 items-center justify-center rounded-full bg-white px-5 active:opacity-85"
                  >
                    <AppText className="font-body-bold text-[15px] text-[#21102F]">
                      Open Settings
                    </AppText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss"
                    accessibilityHint="Closes this sheet."
                    onPress={cancel}
                    className="min-h-12 items-center justify-center rounded-full px-5 active:bg-white/10"
                  >
                    <AppText className="font-body-semibold text-[14px] text-white">
                      Dismiss
                    </AppText>
                  </Pressable>
                </View>
              </>
            ) : listening ? (
              <>
                <AppText
                  accessibilityRole="header"
                  accessibilityLiveRegion="polite"
                  className="font-display text-[28px] sm:text-[32px] leading-[34px] sm:leading-[38px] text-white"
                >
                  {voice.transcript
                    ? `“${voice.transcript}”`
                    : "Speak naturally."}
                </AppText>
                <AppText className="mt-0.5 text-sm sm:text-[15px] leading-5 text-voice-muted">
                  {voice.transcript
                    ? "Finding your news…"
                    : "I’ll show what I heard, then find your news."}
                </AppText>
                {!voice.speechDetected && (
                  <>
                    <View
                      accessible
                      accessibilityRole="progressbar"
                      accessibilityLabel="Listening time before the session closes"
                      className="mt-4 sm:mt-5 h-1 w-full overflow-hidden rounded-full bg-voice-track"
                    >
                      <NativeAnimated.View
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
                    <View className="mt-2.5 gap-1">
                      <AppText className="text-xs sm:text-sm leading-4 text-voice-muted">
                        No speech: a gentle reminder at 4 seconds.
                      </AppText>
                      <AppText className="text-xs sm:text-sm leading-4 text-voice-muted">
                        Closes at 8 seconds and returns here.
                      </AppText>
                    </View>
                  </>
                )}
                <View className="mt-4 border-t border-voice-track pt-3.5">
                  <AppText className="font-body-bold text-[14px] sm:text-[15px] leading-5 text-white">
                    Say “cancel” to stop.
                  </AppText>
                  <AppText className="mt-1 text-xs sm:text-[13px] leading-4 text-voice-muted">
                    Double-tap anywhere to speak again.
                  </AppText>
                </View>
              </>
            ) : resolving ? (
              <>
                {voice.transcript ? (
                  <AppText
                    accessibilityRole="header"
                    className="font-display text-[26px] leading-[32px] text-white"
                  >
                    “{voice.transcript}”
                  </AppText>
                ) : null}
                <View className="h-[1px] w-full bg-white/15" />
                <View className="flex-row items-center justify-between">
                  <AppText className="text-[15px] text-voice-muted">
                    {voice.message || "Working on that…"}
                  </AppText>
                  <ActivityIndicator size="small" color="#C49BFF" />
                </View>
              </>
            ) : clarifying ? (
              <>
                <AppText
                  accessibilityRole="header"
                  className="font-display text-[28px] sm:text-[30px] leading-[34px] sm:leading-[36px] text-white"
                >
                  {voice.prompt ||
                    voice.message ||
                    "Which option would you like?"}
                </AppText>
                <View className="w-full gap-3 pt-2">
                  {voice.choices.map((choice: VoiceChoice, index: number) => {
                    const isFirst = index === 0;
                    return (
                      <Pressable
                        key={choice.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${index + 1}: ${choice.label}`}
                        accessibilityHint={choice.detail}
                        onPress={() => voice.choose(choice)}
                        className={
                          isFirst
                            ? "min-h-[58px] items-start justify-center rounded-[20px] bg-white px-5 active:opacity-90"
                            : "min-h-[58px] items-start justify-center rounded-[20px] border border-white/20 bg-[#543872] px-5 active:bg-[#604282]"
                        }
                      >
                        <AppText
                          className={
                            isFirst
                              ? "font-body-bold text-[16px] leading-5 text-ink"
                              : "font-body-bold text-[16px] leading-5 text-white"
                          }
                        >
                          {index + 1} · {choice.label}
                        </AppText>
                        {choice.detail ? (
                          <AppText
                            className={
                              isFirst
                                ? "mt-0.5 text-[13px] leading-4 text-muted"
                                : "mt-0.5 text-[13px] leading-4 text-voice-muted"
                            }
                          >
                            {choice.detail}
                          </AppText>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
                <AppText className="mt-2 text-sm leading-5 text-voice-muted">
                  Say the name or choice number.
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  accessibilityHint="Cancels ambiguity choice and dismisses voice."
                  onPress={cancel}
                  className="mt-3 min-h-11 items-start justify-center active:opacity-75"
                >
                  <AppText className="font-body-bold text-base text-white">
                    Cancel
                  </AppText>
                </Pressable>
              </>
            ) : failed ? (
              <>
                <AppText
                  accessibilityRole="header"
                  accessibilityLiveRegion="polite"
                  className="font-display text-[28px] leading-[34px] text-white"
                >
                  Try again when{"\n"}you’re ready.
                </AppText>
                <AppText className="text-[14px] leading-5 text-voice-muted">
                  {voice.message || "I did not hear a command."}
                </AppText>
                <View className="mt-2 flex-row items-center gap-3">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Try again"
                    accessibilityHint="Restarts listening."
                    onPress={voice.retry}
                    className="min-h-12 flex-1 items-center justify-center rounded-full bg-white px-5 active:opacity-85"
                  >
                    <AppText className="font-body-bold text-[15px] text-[#21102F]">
                      Try again
                    </AppText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss"
                    accessibilityHint="Closes this sheet."
                    onPress={cancel}
                    className="min-h-12 items-center justify-center rounded-full px-5 active:bg-white/10"
                  >
                    <AppText className="font-body-semibold text-[14px] text-white">
                      Dismiss
                    </AppText>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <AppText
                  accessibilityRole="header"
                  className="font-display text-[26px] leading-[32px] text-white"
                >
                  {voice.message || "Done"}
                </AppText>
              </>
            )}
          </View>

          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className="mt-2 h-[3px] w-full rounded-full bg-[#8E5CD8]"
            style={
              Platform.OS === "web"
                ? ({
                    boxShadow: listening
                      ? "0 0 6px rgba(196, 155, 255, 0.9)"
                      : "0 0 6px rgba(196, 155, 255, 0.4)",
                  } as any)
                : {
                    shadowColor: "#C49BFF",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: listening ? 0.9 : 0.4,
                    shadowRadius: 6,
                  }
            }
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}
