import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef } from "react";
import { Alert, type ScrollView as NativeScrollView } from "react-native";
import { ScrollView, View } from "@/tw";
import { AppScreen } from "@/components/ui/AppScreen";
import { ListRow, ListSection, ToggleRow } from "@/components/ui/List";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { AppText } from "@/components/ui/AppText";
import { useVoice } from "@/hooks/useVoice";
import { usePreferences } from "@/stores";
import { routes } from "@/navigation/routes";
import { settingsCopy as copy } from "@/utils/copy/settings";
import { icons } from "@/utils/icons/app-icons";
import { onboardingVoiceBridge } from "@/stores/onboarding-voice-store";
import { useAccountAccess } from "@/hooks/useAccountAccess";

export function SettingsScreen() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const scrollView = useRef<NativeScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const voice = useVoice();
  const { preferences, updatePreferences } = usePreferences();
  const account = useAccountAccess();

  function reopenOnboarding() {
    Alert.alert(
      copy.resetTitle,
      "This restarts setup but keeps your saved stories, following, and downloads.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: copy.resetAction,
          onPress: () => {
            onboardingVoiceBridge.resetExperience();
            updatePreferences({
              setupComplete: false,
              spokenGuidanceEnabled: false,
            });
            router.replace(routes.onboarding);
          },
        },
      ],
    );
  }

  const status = (label: string) => (
    <AppText variant="overline" tone="primary">
      {label}
    </AppText>
  );

  function scrollToRequestedSection() {
    if (!section) return;

    const y = sectionOffsets.current[section];
    if (y === undefined) return;

    scrollView.current?.scrollTo({ y, animated: false });
  }

  return (
    <AppScreen>
      <ScreenHeader
        title={copy.title}
        eyebrow={copy.eyebrow}
        onBack={router.back}
      />
      <ScrollView
        ref={scrollView}
        contentContainerClassName="w-full max-w-[720px] self-center gap-6 p-4 pb-12"
        onContentSizeChange={scrollToRequestedSection}
      >
        <ListSection label="Account">
          <ListRow
            icon={icons.person}
            title={account.profile?.displayName ?? (account.profile ? "Hear! account" : "Optional account")}
            detail={account.profile?.email ?? (account.profile ? `Connected with ${account.profile.provider}` : `Continue with ${account.provider === "apple" ? "Apple" : "Google"} or keep using Hear without an account.`)}
            onPress={() => {
              if (account.profile) {
                Alert.alert("Sign out?", "Your saved listening stays on this device.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Sign out", style: "destructive", onPress: () => void account.signOut() },
                ]);
              } else {
                void account.signIn();
              }
            }}
            trailing={status(account.profile ? "SIGN OUT" : "SIGN IN")}
          />
          {account.error ? <AppText className="px-4 pb-4" tone="danger">{account.error}</AppText> : null}
        </ListSection>
        <View
          onLayout={({ nativeEvent }) => {
            sectionOffsets.current.connections = nativeEvent.layout.y;
          }}
        >
          <ListSection label={copy.connections}>
            <ListRow
              icon={icons.audioOutput}
              title={copy.audioOutputTitle}
              detail={copy.audioOutputDetail}
              trailing={status("ACTIVE")}
            />
            <ListRow
              icon={icons.bluetooth}
              title={copy.bluetoothTitle}
              detail={copy.bluetoothDetail}
              trailing={status("ADD")}
            />
            <ListRow
              icon={icons.internet}
              title={copy.internetTitle}
              detail={copy.internetDetail}
              trailing={status("ONLINE")}
            />
            <ListRow
              icon={icons.wifi}
              title={copy.wifiTitle}
              detail={copy.wifiDetail}
              trailing={status("CONNECT…")}
            />
          </ListSection>
        </View>
        <View
          onLayout={({ nativeEvent }) => {
            sectionOffsets.current.voice = nativeEvent.layout.y;
          }}
        >
          <ListSection label={copy.voiceAudio}>
            <ListRow
              icon={icons.microphone}
              title={copy.voiceTitle}
              detail={copy.voiceDetail}
              onPress={() => voice.startVoiceSession({ source: "contextualAction" })}
              trailing={status("OPEN")}
            />
            <ListRow
              icon={icons.playback}
              title={copy.playbackTitle}
              detail={copy.playbackDetail}
              onPress={() => router.push(routes.player)}
              trailing={status("OPEN")}
            />
          </ListSection>
        </View>
        <View
          onLayout={({ nativeEvent }) => {
            sectionOffsets.current.experience = nativeEvent.layout.y;
          }}
        >
          <ListSection label={copy.experience}>
            <ToggleRow
              title={copy.spokenNavigationTitle}
              detail={copy.spokenNavigationDetail}
              value={preferences.spokenGuidanceEnabled}
              onChange={(spokenGuidanceEnabled) =>
                updatePreferences({ spokenGuidanceEnabled })
              }
            />
            <ListRow
              icon={icons.accessibility}
              title={copy.accessibilityTitle}
              detail={copy.accessibilityDetail}
              trailing={status("OPEN")}
            />
            <ListRow
              icon={icons.location}
              title={copy.locationTitle}
              detail={preferences.town || copy.notSet}
              trailing={status("OPEN")}
            />
            <ListRow
              icon={icons.privacy}
              title={copy.privacyTitle}
              detail={copy.privacyDetail}
              trailing={status("OPEN")}
            />
            <ListRow
              icon={icons.repeat}
              title={copy.resetTitle}
              detail={copy.resetDescription}
              onPress={reopenOnboarding}
              trailing={status("RESTART")}
            />
          </ListSection>
        </View>
      </ScrollView>
    </AppScreen>
  );
}
