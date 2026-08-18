import type { ReactNode } from "react";
import { ActivityIndicator, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AppText } from "@/components/ui/AppText";
import { View } from "@/tw";
import type { VoiceState } from "@/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type VoiceSessionSurfaceProps = {
  state: VoiceState;
  message: string;
  transcript?: string;
  onCancel: () => void;
  onRetry?: () => void;
  children?: ReactNode;
};

const stateBadges: Record<VoiceState, string> = {
  idle: "VOICE READY",
  permission: "CHECKING ACCESS",
  preparing: "GETTING READY",
  listening: "LISTENING",
  resolving: "I HEARD",
  clarifying: "ONE MORE DETAIL",
  executing: "WORKING ON THAT",
  success: "DONE",
  error: "I DIDN’T HEAR A COMMAND",
  cancelled: "VOICE CLOSED",
};

export function VoiceSessionSurface({
  state,
  message,
  transcript,
  onCancel,
  onRetry,
  children,
}: VoiceSessionSurfaceProps) {
  const insets = useSafeAreaInsets();
  const listening = state === "listening";
  const resolving = state === "resolving" || state === "executing";
  const clarifying = state === "clarifying";
  const failed = state === "error";

  return (
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

      <View className="flex-row items-center justify-between pb-4 pt-1">
        <AppText
          variant="overline"
          className={failed ? "text-[#F1B6BE] tracking-[1.4px]" : "text-voice-indicator tracking-[1.4px]"}
        >
          {stateBadges[state]}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={listening ? "Stop listening" : "Cancel voice session"}
          accessibilityHint="Closes voice control."
          onPress={onCancel}
          hitSlop={8}
          className="min-h-12 items-center justify-center rounded-xl px-3 active:bg-white/10"
        >
          <AppText className="font-body-semibold text-[14px] text-white">
            {listening ? "Stop" : "Cancel"}
          </AppText>
        </Pressable>
      </View>

      <View className="gap-4 pb-4">
        {listening ? (
          <>
            <AppText
              accessibilityRole="header"
              accessibilityLiveRegion="polite"
              className="font-display text-[30px] leading-[36px] text-white"
            >
              What would you{"\n"}like to do?
            </AppText>
            <AppText className="text-[14px] leading-5 text-voice-muted">
              Speak naturally. I’ll stop after one command.
            </AppText>
          </>
        ) : resolving ? (
          <>
            {transcript ? (
              <AppText
                accessibilityRole="header"
                className="font-display text-[26px] leading-[32px] text-white"
              >
                “{transcript}”
              </AppText>
            ) : null}
            <View className="h-[1px] w-full bg-white/15" />
            <View className="flex-row items-center justify-between">
              <AppText className="text-[15px] text-voice-muted">
                {message || "Opening audio…"}
              </AppText>
              <ActivityIndicator size="small" color="#C49BFF" />
            </View>
          </>
        ) : clarifying ? (
          <>
            <AppText
              accessibilityRole="header"
              className="font-display text-[26px] leading-[32px] text-white"
            >
              {message || "Which option would you like?"}
            </AppText>
            {children}
            <AppText className="text-[13px] text-voice-muted">
              Say the name or choice number · “Cancel” returns
            </AppText>
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
              {message || "Offline and permission errors use this same shell."}
            </AppText>
            <View className="mt-2 flex-row items-center gap-3">
              {onRetry ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Try again"
                  accessibilityHint="Restarts listening."
                  onPress={onRetry}
                  className="min-h-12 flex-1 items-center justify-center rounded-full bg-white px-5 active:opacity-85"
                >
                  <AppText className="font-body-bold text-[15px] text-[#21102F]">
                    Try again
                  </AppText>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss"
                accessibilityHint="Closes this sheet."
                onPress={onCancel}
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
              {message}
            </AppText>
            {children}
          </>
        )}
      </View>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="mt-2 h-[3px] w-full rounded-full bg-[#8E5CD8]"
        style={{
          shadowColor: "#C49BFF",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: listening ? 0.9 : 0.4,
          shadowRadius: 6,
        }}
      />
    </View>
  );
}
