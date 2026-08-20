import { useState } from "react";
import { Switch } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Pressable, ScrollView, View } from "@/tw";
import { usePlayback } from "@/stores";
import { colors } from "@/constants/theme";

export function PlaybackSettingsView({ onBack }: { onBack: () => void }) {
  const playback = usePlayback();
  const [autoPlay, setAutoPlay] = useState(true);

  return (
    <View className="flex-1 bg-canvas">
      <View className="w-full max-w-[720px] flex-1 self-center">
        <ScreenHeader title="Playback preferences" onBack={onBack} />
        <ScrollView
          contentContainerClassName="px-5 pt-4 pb-12 gap-6"
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-3">
            <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
              DEFAULTS
            </AppText>
            <View className="flex-row items-center justify-between rounded-[20px] border border-border bg-surface p-5">
              <View className="gap-1 flex-1 pr-3">
                <AppText className="font-body-bold text-base leading-5 text-ink">
                  Playback speed
                </AppText>
                <AppText tone="muted" className="text-xs leading-4">
                  {playback.speed}×
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change playback speed"
                onPress={() => playback.stepSpeed("up")}
                className="min-h-11 justify-center active:opacity-70"
              >
                <AppText className="font-body-bold text-xs leading-4 text-primary">
                  CHANGE
                </AppText>
              </Pressable>
            </View>

            <View className="flex-row items-center justify-between rounded-[20px] border border-border bg-surface p-5">
              <View className="gap-1 flex-1 pr-3">
                <AppText className="font-body-bold text-base leading-5 text-ink">
                  Skip interval
                </AppText>
                <AppText tone="muted" className="text-xs leading-4">
                  10 seconds
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change skip interval"
                className="min-h-11 justify-center active:opacity-70"
              >
                <AppText className="font-body-bold text-xs leading-4 text-primary">
                  CHANGE
                </AppText>
              </Pressable>
            </View>

            <View className="flex-row items-center justify-between rounded-[20px] border border-border bg-surface p-5">
              <View className="gap-1 flex-1 pr-3">
                <AppText className="font-body-bold text-base leading-5 text-ink">
                  Auto-play next
                </AppText>
                <AppText tone="muted" className="text-xs leading-4">
                  Continue through the queue
                </AppText>
              </View>
              <Switch
                accessibilityRole="switch"
                accessibilityLabel="Auto-play next"
                value={autoPlay}
                onValueChange={setAutoPlay}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
          </View>

          <View className="gap-3">
            <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
              SLEEP TIMER
            </AppText>
            <View className="flex-row items-center justify-between rounded-[20px] border border-border bg-surface p-5">
              <View className="gap-1 flex-1 pr-3">
                <AppText className="font-body-bold text-base leading-5 text-ink">
                  Default timer
                </AppText>
                <AppText tone="muted" className="text-xs leading-4">
                  Off
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change default timer"
                className="min-h-11 justify-center active:opacity-70"
              >
                <AppText className="font-body-bold text-xs leading-4 text-primary">
                  CHANGE
                </AppText>
              </Pressable>
            </View>
          </View>

          <View className="rounded-[20px] bg-voice-panel p-5 gap-1.5">
            <AppText variant="overline" className="text-voice-muted tracking-[0.4px]">
              VOICE EXAMPLE
            </AppText>
            <AppText className="font-body-medium text-sm leading-[18px] text-white">
              “Set playback speed to 1.25.”
            </AppText>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
