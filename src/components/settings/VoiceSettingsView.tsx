import { Switch } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Pressable, ScrollView, View } from "@/tw";
import { usePreferences } from "@/stores";
import { colors } from "@/constants/theme";

export function VoiceSettingsView({ onBack }: { onBack: () => void }) {
  const { preferences, updatePreferences } = usePreferences();

  return (
    <View className="flex-1">
      <ScreenHeader title="Voice and microphone" onBack={onBack} />
      <ScrollView
          contentContainerClassName="px-5 pt-4 pb-12 gap-6"
          showsVerticalScrollIndicator={false}
        >
          <View className="rounded-[20px] bg-[#E6F1EF] p-5 gap-1.5">
            <AppText className="font-body-bold text-[11px] leading-3 tracking-[1.1px] text-[#0F6973]">
              STATUS
            </AppText>
            <AppText className="font-display text-xl leading-6 text-[#0F6973]">
              Microphone access is ready
            </AppText>
            <AppText className="text-xs leading-4 text-[#21484C]">
              Shake gesture is available throughout Hear!
            </AppText>
          </View>

          <View className="gap-3">
            <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
              VOICE
            </AppText>
            <View className="flex-row items-center justify-between rounded-[20px] border border-border bg-surface p-5">
              <View className="gap-1 flex-1 pr-3">
                <AppText className="font-body-bold text-base leading-5 text-ink">
                  Language
                </AppText>
                <AppText tone="muted" className="text-xs leading-4">
                  English (United Kingdom)
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change language"
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
                  Spoken feedback
                </AppText>
                <AppText tone="muted" className="text-xs leading-4">
                  Confirm voice actions aloud
                </AppText>
              </View>
              <Switch
                accessibilityRole="switch"
                accessibilityLabel="Spoken feedback"
                value={preferences.spokenGuidanceEnabled}
                onValueChange={(spokenGuidanceEnabled) =>
                  updatePreferences({ spokenGuidanceEnabled })
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
          </View>

          <View className="gap-3">
            <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
              TEST AND HELP
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Run sound check"
              className="flex-row items-center justify-between rounded-[20px] border border-border bg-surface p-5 active:opacity-80"
            >
              <AppText className="font-body-bold text-base leading-5 text-ink">
                Run sound check
              </AppText>
              <AppText className="text-xl text-muted">›</AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voice command guide"
              className="flex-row items-center justify-between rounded-[20px] border border-border bg-surface p-5 active:opacity-80"
            >
              <AppText className="font-body-bold text-base leading-5 text-ink">
                Voice command guide
              </AppText>
              <AppText className="text-xl text-muted">›</AppText>
            </Pressable>
          </View>

          <View className="rounded-[20px] bg-primary-soft p-5 gap-1.5">
            <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
              VOICE CONTROL
            </AppText>
            <AppText className="font-body-medium text-sm leading-[18px] text-ink">
              “Turn spoken feedback off.”
            </AppText>
          </View>
        </ScrollView>
    </View>
  );
}
