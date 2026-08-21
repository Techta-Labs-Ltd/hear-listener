import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppScreen } from "@/components/ui/AppScreen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { AppText } from "@/components/ui/AppText";
import { Pressable, ScrollView, View } from "@/tw";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { usePlayback, usePreferences } from "@/stores";
import { routes } from "@/navigation/routes";
import { safeBack } from "@/utils/navigation";
import { AccountSettingsView } from "@/components/settings/AccountSettingsView";
import { VoiceSettingsView } from "@/components/settings/VoiceSettingsView";
import { PlaybackSettingsView } from "@/components/settings/PlaybackSettingsView";
import { AccessibilitySettingsView } from "@/components/settings/AccessibilitySettingsView";
import { PrivacySettingsView } from "@/components/settings/PrivacySettingsView";

export function SettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string }>();
  const [localSection, setLocalSection] = useState<string | null | undefined>(undefined);
  const activeSection = localSection !== undefined ? localSection : (params.section ?? null);
  const setActiveSection = (sec: string | null) => setLocalSection(sec);
  const account = useAccountAccess();
  const { preferences } = usePreferences();
  const playback = usePlayback();

  if (activeSection === "account") {
    return <AccountSettingsView onBack={() => setActiveSection(null)} />;
  }
  if (activeSection === "voice" || activeSection === "voice-mic") {
    return <VoiceSettingsView onBack={() => setActiveSection(null)} />;
  }
  if (activeSection === "playback") {
    return <PlaybackSettingsView onBack={() => setActiveSection(null)} />;
  }
  if (activeSection === "accessibility") {
    return <AccessibilitySettingsView onBack={() => setActiveSection(null)} />;
  }
  if (activeSection === "privacy") {
    return <PrivacySettingsView onBack={() => setActiveSection(null)} />;
  }

  const accountName = account.profile?.displayName || "Optional account";
  const accountDetail = account.profile?.email || "Sync listening across devices";

  return (
    <AppScreen
      screenTitle="Settings"
      screenOrientation="Settings. Say change accessibility, change location, set up Hear again, or read this screen."
      voiceCommands={["change accessibility", "change location", "set up Hear again", "read this screen"]}
    >
      <ScreenHeader
        title="Settings"
        eyebrow="PREFERENCES"
        onBack={() => safeBack(router, routes.home)}
      />
      <ScrollView
        contentContainerClassName="px-5 pt-4 pb-12 gap-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-3">
          <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
            ACCOUNT
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={account.profile ? "Manage account" : "Sign in to optional account"}
            accessibilityHint="Opens account settings and sync status."
            onPress={() => setActiveSection("account")}
            className="flex-row items-center justify-between rounded-[20px] border border-border/60 bg-surface p-5 active:opacity-85 shadow-sm"
          >
            <View className="flex-1 gap-1 pr-3">
              <AppText className="font-body-bold text-base leading-5 text-ink">
                {accountName}
              </AppText>
              <AppText tone="muted" className="text-xs leading-4">
                {accountDetail}
              </AppText>
            </View>
            <AppText className="font-body-bold text-xs leading-4 text-primary">
              {account.profile ? "MANAGE" : "SIGN IN"}
            </AppText>
          </Pressable>
        </View>

        <View className="gap-3">
          <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
            VOICE AND AUDIO
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voice and microphone settings"
            onPress={() => setActiveSection("voice")}
            className="flex-row items-center justify-between rounded-[20px] border border-border/60 bg-surface p-5 active:opacity-85 shadow-sm"
          >
            <View className="flex-1 gap-1 pr-3">
              <AppText className="font-body-bold text-base leading-5 text-ink">
                Voice and microphone
              </AppText>
              <AppText tone="muted" className="text-xs leading-4">
                Ready · UK English
              </AppText>
            </View>
            <AppText className="text-xl text-muted">›</AppText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Playback preferences"
            onPress={() => setActiveSection("playback")}
            className="flex-row items-center justify-between rounded-[20px] border border-border/60 bg-surface p-5 active:opacity-85 shadow-sm"
          >
            <View className="flex-1 gap-1 pr-3">
              <AppText className="font-body-bold text-base leading-5 text-ink">
                Playback preferences
              </AppText>
              <AppText tone="muted" className="text-xs leading-4">
                {playback.speed === 1 ? "Normal speed" : `${playback.speed}× speed`} · No sleep timer
              </AppText>
            </View>
            <AppText className="text-xl text-muted">›</AppText>
          </Pressable>
        </View>

        <View className="gap-3">
          <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
            EXPERIENCE
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Accessibility settings"
            onPress={() => setActiveSection("accessibility")}
            className="flex-row items-center justify-between rounded-[20px] border border-border/60 bg-surface p-5 active:opacity-85 shadow-sm"
          >
            <View className="flex-1 gap-1 pr-3">
              <AppText className="font-body-bold text-base leading-5 text-ink">
                Accessibility
              </AppText>
              <AppText tone="muted" className="text-xs leading-4">
                Contrast, motion, {preferences.spokenGuidanceEnabled ? "spoken feedback" : "silent"}
              </AppText>
            </View>
            <AppText className="text-xl text-muted">›</AppText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Privacy and location settings"
            onPress={() => setActiveSection("privacy")}
            className="flex-row items-center justify-between rounded-[20px] border border-border/60 bg-surface p-5 active:opacity-85 shadow-sm"
          >
            <View className="flex-1 gap-1 pr-3">
              <AppText className="font-body-bold text-base leading-5 text-ink">
                Privacy and location
              </AppText>
              <AppText tone="muted" className="text-xs leading-4">
                Permissions and local area
              </AppText>
            </View>
            <AppText className="text-xl text-muted">›</AppText>
          </Pressable>
        </View>

        <View className="rounded-[20px] bg-voice-panel p-5">
          <AppText className="font-body-bold text-sm leading-[18px] text-white">
            Double-tap and say “Open voice settings.”
          </AppText>
        </View>
      </ScrollView>
    </AppScreen>
  );
}
