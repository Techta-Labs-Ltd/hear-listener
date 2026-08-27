import { AppText } from "@/components/ui/AppText";
import { colors } from "@/constants/theme";
import { VOICE_STATE_BADGES, VOICE_TIMING } from "@/constants/voice";
import { useListeningTimer } from "@/hooks/useListeningTimer";
import { useVoice } from "@/hooks/useVoice";
import { useVoiceStore } from "@/stores/voice-store";
import { View } from "@/tw";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PermissionDeniedView } from "../settings/PermissionDeniedView";
import { AmbiguityPanel } from "./AmbiguityPanel";
import { ListeningCountdown } from "./ListeningCountdown";
import { VoiceStatusBadge } from "./VoiceStatusBadge";

export function GlobalVoiceDock() {
  const voice = useVoice();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const currentPathRef = useRef(pathname);

  const isVoiceOpen = voice.state !== "idle";
  const listening = voice.state === "listening";
  const resolving = voice.state === "resolving" || voice.state === "executing";
  const clarifying = voice.state === "clarifying";
  const failed = voice.state === "error";
  const isPermissionDenied = failed && voice.errorCode === "permission-denied";

  // Auto-dismiss voice overlay when navigation occurs to a new screen
  useEffect(() => {
    if (currentPathRef.current !== pathname) {
      currentPathRef.current = pathname;
      if (voice.state !== "idle") {
        useVoiceStore.getState().resetVoice();
      }
    }
  }, [pathname, voice.state]);

  const { fillPercent } = useListeningTimer(
    voice.listeningDeadlineAt,
    voice.speechDetected,
    VOICE_TIMING.noSpeechTimeout,
  );

  const cancel =
    listening || voice.state === "preparing" ? voice.cancel : voice.close;
  const stop = voice.stop;

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

  // If microphone permission is denied, show full screen PermissionDeniedView
  if (isPermissionDenied) {
    return (
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(180)}
        style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}
      >
        <StatusBar style="dark" />
        <PermissionDeniedView
          onBack={cancel}
          onContinueWithoutVoice={cancel}
        />
      </Animated.View>
    );
  }

  const isBackdropDismissible = failed || voice.state === "cancelled";

  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(160)}
      style={[
        StyleSheet.absoluteFill,
        {
          zIndex: 9999,
          justifyContent: "flex-end",
          pointerEvents: "box-none",
        },
      ]}
    >
      <StatusBar style="light" />

      {/* Dismissible Backdrop */}
      <Pressable
        accessibilityRole={isBackdropDismissible ? "button" : undefined}
        accessibilityLabel={isBackdropDismissible ? "Dismiss voice control" : undefined}
        accessibilityHint={isBackdropDismissible ? "Closes voice control and returns to the current screen." : undefined}
        onPress={isBackdropDismissible ? cancel : undefined}
        className="absolute inset-0 bg-black/40"
      />

      {/* Bottom Sheet Docked at Bottom */}
      <Animated.View
        entering={SlideInDown.duration(240).damping(18)}
        exiting={SlideOutDown.duration(200)}
        className="w-full max-w-[560px] self-center"
      >
        <LinearGradient
          colors={[colors.voiceCanvas, colors.voicePanel]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            width: "100%",
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom + 16, 28),
            paddingHorizontal: 24,
            borderTopWidth: 1,
            borderColor: "rgba(217, 203, 237, 0.15)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 16,
          }}
        >
          {/* Top Grab Handle */}
          <View className="items-center pb-2">
            <View className="h-1 w-[64px] rounded-full bg-voice-muted opacity-65" />
          </View>

          {/* Header Row with Badge, Circular Counter & Cancel Button */}
          <View className="flex-row items-center justify-between pb-3 pt-1">
            <VoiceStatusBadge
              label={
                listening && voice.speechDetected
                  ? "I CAN HEAR YOU"
                  : VOICE_STATE_BADGES[voice.state]
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
                accessibilityHint="Stops voice listening and closes the voice panel."
                onPress={listening ? stop : cancel}
                hitSlop={8}
                className="min-h-10 items-center justify-center rounded-xl px-3 active:bg-white/10"
              >
                <AppText className="font-body-semibold text-[14px] text-white">
                  {listening ? "Stop" : "Cancel"}
                </AppText>
              </Pressable>
            </View>
          </View>

          {/* Body Content */}
          <View className="gap-3 pb-3">
            {listening ? (
              <>
                <AppText
                  accessibilityRole="header"
                  importantForAccessibility="no"
                  className="font-display text-[28px] sm:text-[32px] leading-[34px] sm:leading-[38px] text-white"
                >
                  {voice.transcript
                    ? `“${voice.transcript}”`
                    : "Speak naturally."}
                </AppText>
                <AppText
                  importantForAccessibility="no"
                  className="mt-0.5 text-sm sm:text-[15px] leading-5 text-voice-muted"
                >
                  {voice.transcript
                    ? "Finding your news…"
                    : "I’ll show what I heard, then find your news."}
                </AppText>

                {/* Delicate Progress Bar (h-1 / 4px) in exact sync with countdown */}
                {!voice.speechDetected && (
                  <>
                    <View
                      accessible={false}
                      importantForAccessibility="no-hide-descendants"
                      accessibilityElementsHidden
                      className="mt-4 sm:mt-5 h-1 w-full overflow-hidden rounded-full bg-voice-track"
                    >
                      <View
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                        className="h-full rounded-full bg-voice-indicator"
                        style={{ width: `${fillPercent}%` }}
                      />
                    </View>
                    <View
                      accessible={false}
                      importantForAccessibility="no-hide-descendants"
                      accessibilityElementsHidden
                      className="mt-2.5 gap-1"
                    >
                      <AppText className="text-xs sm:text-sm leading-4 text-voice-muted">
                        No speech: a gentle reminder at 4 seconds.
                      </AppText>
                      <AppText className="text-xs sm:text-sm leading-4 text-voice-muted">
                        Closes at 8 seconds and returns here.
                      </AppText>
                    </View>
                  </>
                )}

                <View
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                  accessibilityElementsHidden
                  className="mt-4 border-t border-voice-track pt-3.5"
                >
                  <AppText className="font-body-bold text-[14px] sm:text-[15px] leading-5 text-white">
                    Say “cancel” to stop.
                  </AppText>
                  <AppText className="mt-1 text-xs sm:text-[13px] leading-4 text-voice-muted">
                    Shake device to speak again.
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
                <View className="h-[1px] w-full bg-white/15 my-1" />
                <View className="flex-row items-center justify-between py-1">
                  <AppText className="text-[15px] text-voice-muted">
                    {voice.message || "Working on that…"}
                  </AppText>
                  <ActivityIndicator size="small" color="#C49BFF" />
                </View>
              </>
            ) : clarifying ? (
              <AmbiguityPanel
                prompt={
                  voice.prompt ||
                  voice.message ||
                  "Which option would you like?"
                }
                choices={voice.choices}
                onSelect={(choice) => voice.choose(choice)}
                onCancel={cancel}
              />
            ) : voice.state === "preparing" ? (
              <>
                <AppText
                  accessibilityRole="header"
                  className="font-display text-[28px] sm:text-[32px] leading-[34px] sm:leading-[38px] text-white"
                >
                  Getting ready…
                </AppText>
                <AppText className="mt-0.5 text-sm sm:text-[15px] leading-5 text-voice-muted">
                  {voice.message || "Hear is preparing voice control."}
                </AppText>
                <View className="mt-4 flex-row items-center justify-between border-t border-voice-track pt-3.5">
                  <AppText className="text-xs sm:text-[13px] leading-4 text-voice-muted">
                    Speak after the chime tone.
                  </AppText>
                  <ActivityIndicator size="small" color="#C49BFF" />
                </View>
              </>
            ) : failed ? (
              <>
                <AppText
                  accessibilityRole="header"
                  className="font-display text-[28px] sm:text-[32px] leading-[34px] sm:leading-[38px] text-white"
                >
                  {voice.transcript ? `“${voice.transcript}”` : "I didn’t hear that."}
                </AppText>
                <AppText className="mt-0.5 text-sm sm:text-[15px] leading-5 text-voice-muted">
                  {voice.message || "Say “Play my local news.”"}
                </AppText>

                <View className="mt-4 border-t border-voice-track pt-3.5">
                  <AppText className="font-body-bold text-[14px] sm:text-[15px] leading-5 text-white">
                    Say “Play my local news.”
                  </AppText>
                  <AppText className="mt-1 text-xs sm:text-[13px] leading-4 text-voice-muted">
                    Shake device to speak again.
                  </AppText>
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
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}
