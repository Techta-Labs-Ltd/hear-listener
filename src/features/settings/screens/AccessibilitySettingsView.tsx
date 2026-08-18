import { useState } from "react";
import { Switch } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScrollView, View } from "@/tw";
import { usePreferences } from "@/stores";
import { colors } from "@/constants/theme";

export function AccessibilitySettingsView({ onBack }: { onBack: () => void }) {
  const { preferences, updatePreferences } = usePreferences();
  const [voiceConfirmations, setVoiceConfirmations] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader title="Accessibility" onBack={onBack} />
      <ScrollView
        contentContainerClassName="px-5 pt-4 pb-12 gap-6"
        showsVerticalScrollIndicator={false}
      >

        <View className="gap-3">
          <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
            SPOKEN EXPERIENCE
          </AppText>
          <View className="flex-row items-center justify-between rounded-[20px] border border-border bg-surface p-5">
            <View className="gap-1 flex-1 pr-3">
              <AppText className="font-body-bold text-base leading-5 text-ink">
                Spoken navigation
              </AppText>
              <AppText tone="muted" className="text-xs leading-4">
                Announce screens and main actions
              </AppText>
            </View>
            <Switch
              accessibilityRole="switch"
              accessibilityLabel="Spoken navigation"
              value={preferences.spokenGuidanceEnabled}
              onValueChange={(spokenGuidanceEnabled) =>
                updatePreferences({ spokenGuidanceEnabled })
              }
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          <View className="flex-row items-center justify-between rounded-[20px] border border-border bg-surface p-5">
            <View className="gap-1 flex-1 pr-3">
              <AppText className="font-body-bold text-base leading-5 text-ink">
                Voice confirmations
              </AppText>
              <AppText tone="muted" className="text-xs leading-4">
                Speak result after each command
              </AppText>
            </View>
            <Switch
              accessibilityRole="switch"
              accessibilityLabel="Voice confirmations"
              value={voiceConfirmations}
              onValueChange={setVoiceConfirmations}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        <View className="gap-3">
          <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
            VISUAL
          </AppText>
          <View className="flex-row items-center justify-between rounded-[20px] border border-border bg-surface p-5">
            <View className="gap-1 flex-1 pr-3">
              <AppText className="font-body-bold text-base leading-5 text-ink">
                High contrast
              </AppText>
              <AppText tone="muted" className="text-xs leading-4">
                Increase borders and focus states
              </AppText>
            </View>
            <Switch
              accessibilityRole="switch"
              accessibilityLabel="High contrast"
              value={highContrast}
              onValueChange={setHighContrast}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          <View className="flex-row items-center justify-between rounded-[20px] border border-border bg-surface p-5">
            <View className="gap-1 flex-1 pr-3">
              <AppText className="font-body-bold text-base leading-5 text-ink">
                Reduce motion
              </AppText>
              <AppText tone="muted" className="text-xs leading-4">
                Use fades instead of movement
              </AppText>
            </View>
            <Switch
              accessibilityRole="switch"
              accessibilityLabel="Reduce motion"
              value={reduceMotion}
              onValueChange={setReduceMotion}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        <View className="rounded-[20px] bg-primary-soft p-5 gap-1.5">
          <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
            LARGE TEXT READY
          </AppText>
          <AppText className="font-body-medium text-sm leading-[18px] text-ink">
            Layouts reflow at 200% text scale.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}
