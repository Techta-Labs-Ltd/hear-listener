import { useState } from "react";
import { Linking, Switch } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Pressable, ScrollView, View } from "@/tw";
import { colors } from "@/constants/theme";

export function PrivacySettingsView({ onBack }: { onBack: () => void }) {
  const [diagnostics, setDiagnostics] = useState(false);

  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader title="Privacy and location" onBack={onBack} />
      <ScrollView
        contentContainerClassName="px-5 pt-4 pb-12 gap-6"
        showsVerticalScrollIndicator={false}
      >

        <View className="rounded-[20px] bg-[#E6F1EF] p-5 gap-1.5">
          <AppText className="font-body-bold text-[11px] leading-3 tracking-[1.1px] text-[#0F6973]">
            MICROPHONE PRIVACY
          </AppText>
          <AppText className="font-display text-xl leading-6 text-[#0F6973]">
            Hear! listens only after double-tap.
          </AppText>
          <AppText className="text-xs leading-4 text-[#21484C]">
            Each voice session stops after one command.
          </AppText>
        </View>

        <View className="gap-3">
          <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
            PERMISSIONS
          </AppText>
          <View className="flex-row items-center justify-between rounded-[20px] border border-border bg-surface p-5">
            <View className="gap-1 flex-1 pr-3">
              <AppText className="font-body-bold text-base leading-5 text-ink">
                Microphone
              </AppText>
              <AppText className="font-body-medium text-xs leading-4 text-[#0F6973]">
                Allowed
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open microphone settings"
              onPress={() => void Linking.openSettings()}
              className="min-h-11 justify-center active:opacity-70"
            >
              <AppText className="font-body-bold text-xs leading-4 text-primary">
                SETTINGS
              </AppText>
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between rounded-[20px] border border-border bg-surface p-5">
            <View className="gap-1 flex-1 pr-3">
              <AppText className="font-body-bold text-base leading-5 text-ink">
                Location
              </AppText>
              <AppText tone="muted" className="text-xs leading-4">
                While using the app
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change location permission"
              onPress={() => void Linking.openSettings()}
              className="min-h-11 justify-center active:opacity-70"
            >
              <AppText className="font-body-bold text-xs leading-4 text-primary">
                CHANGE
              </AppText>
            </Pressable>
          </View>
        </View>

        <View className="gap-3">
          <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
            DATA
          </AppText>
          <View className="flex-row items-center justify-between rounded-[20px] border border-border bg-surface p-5">
            <View className="gap-1 flex-1 pr-3">
              <AppText className="font-body-bold text-base leading-5 text-ink">
                Voice diagnostics
              </AppText>
              <AppText tone="muted" className="text-xs leading-4">
                {diagnostics ? "On" : "Off"}
              </AppText>
            </View>
            <Switch
              accessibilityRole="switch"
              accessibilityLabel="Voice diagnostics"
              value={diagnostics}
              onValueChange={setDiagnostics}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Privacy details"
            className="flex-row items-center justify-between rounded-[20px] border border-border bg-surface p-5 active:opacity-80"
          >
            <AppText className="font-body-bold text-base leading-5 text-ink">
              Privacy details
            </AppText>
            <AppText className="text-xl text-muted">›</AppText>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
