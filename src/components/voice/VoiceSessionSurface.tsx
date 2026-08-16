import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AppText } from "@/components/ui/AppText";
import { SafeAreaView, View } from "@/tw";
import type { VoiceState } from "@/types";

type VoiceSessionSurfaceProps = {
  state: VoiceState;
  message: string;
  transcript?: string;
  onCancel: () => void;
  onRetry?: () => void;
  children?: ReactNode;
};

const stateTitles: Record<VoiceState, string> = {
  idle: "Voice ready",
  permission: "Checking voice access",
  preparing: "Getting ready",
  listening: "Listening",
  resolving: "Working on that",
  clarifying: "One more detail",
  executing: "Working on that",
  success: "Done",
  error: "Let’s try again",
  cancelled: "Voice closed",
};

export function VoiceSessionSurface({
  state,
  message,
  transcript,
  onCancel,
  onRetry,
  children,
}: VoiceSessionSurfaceProps) {
  const listening = state === "listening";
  const failed = state === "error";

  return (
    <SafeAreaView className="flex-1 bg-voice-canvas">
      <StatusBar style="light" />
      <View className="flex-1 px-6 pb-8 pt-5">
        <View className="flex-row items-center justify-between">
          <AppText variant="overline" className="text-voice-muted">
            HEAR! VOICE
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={listening ? "Stop listening" : "Cancel voice command"}
            accessibilityHint="Closes the current voice session."
            onPress={onCancel}
            className="min-h-12 justify-center rounded-xl px-4 active:bg-white/10"
          >
            <AppText className="font-body-semibold" tone="inverse">
              {listening ? "Stop" : "Cancel"}
            </AppText>
          </Pressable>
        </View>

        <View className="flex-1 justify-center gap-7">
          <View className="gap-3">
            <AppText
              accessibilityRole="header"
              accessibilityLiveRegion="polite"
              className="font-display text-5xl leading-[1.05] text-white"
            >
              {stateTitles[state]}
            </AppText>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className={listening ? "h-1 w-24 bg-voice-glow" : "h-1 w-12 bg-white/35"}
            />
          </View>

          {transcript ? (
            <AppText className="font-display text-3xl leading-10 text-white">
              “{transcript}”
            </AppText>
          ) : null}
          <AppText className="max-w-[36rem] text-lg leading-8 text-voice-muted">
            {message}
          </AppText>
          {children}
        </View>

        {failed && onRetry ? (
          <View className="border-t border-white/20 pt-5">
            <AppText className="font-body-semibold text-voice-muted">
              Double-tap anywhere to try again.
            </AppText>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
