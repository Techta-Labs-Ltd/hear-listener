import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "@/components/ui/AppText";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { PromptCard } from "@/components/onboarding/PromptCard";
import { VoiceStatusBadge } from "@/components/voice/VoiceStatusBadge";
import { colors } from "@/constants/theme";
import { ONBOARDING_SPEECH } from "@/constants/onboarding-steps";
import { Pressable, ScrollView, View } from "@/tw";
import type { VoiceAccessStepProps } from "@/types";

export function VoiceAccessStep({
  phase,
  screenReaderEnabled,
  voiceState,
  voiceMessage,
  transcript,
  deadlineAt,
  speechDetected,
  onRequestPermission,
  onOpenSettings,
  onRetryVoiceTest,
  onEnableVoice,
}: VoiceAccessStepProps) {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const isRetryablePermissionDenied = phase === "permissionDenied";
  const isPermissionBlocked = phase === "permissionBlocked";
  const isDenied = isRetryablePermissionDenied || isPermissionBlocked;
  const isVoiceTest =
    phase === "voiceTestListening" ||
    phase === "voiceTestError" ||
    phase === "voiceTestSuccess" ||
    phase === "voiceTestReady";

  const handleAction = isDenied
    ? isPermissionBlocked
      ? onOpenSettings
      : onRequestPermission || (() => {})
    : isVoiceTest
      ? onRetryVoiceTest
      : onRequestPermission || onEnableVoice || (() => {});

  const accessibilityLabel = isDenied
    ? isPermissionBlocked
      ? ONBOARDING_SPEECH.permissionBlocked
      : isWeb
        ? ONBOARDING_SPEECH.permissionDeniedWeb
        : ONBOARDING_SPEECH.permissionDenied
    : isVoiceTest
      ? voiceState === "error"
        ? ONBOARDING_SPEECH.voiceTestNoSpeech
        : "Hear! is listening. Say: Play my local news."
      : ONBOARDING_SPEECH.permissionIntro;

  const accessibilityHint = isDenied
    ? isPermissionBlocked
      ? "Shake device to open Settings."
      : "Shake device to request microphone permission again."
    : isVoiceTest
      ? "Shake device to try the voice command again."
      : "Shake device to request microphone permission.";

  return (
    <Pressable
      accessible={screenReaderEnabled}
      accessibilityRole={screenReaderEnabled ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={
        screenReaderEnabled && phase !== "voiceTestListening"
          ? handleAction
          : undefined
      }
      className="flex-1 bg-canvas justify-between"
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-6"
        showsVerticalScrollIndicator={false}
        accessible={!screenReaderEnabled}
      >
        <View style={{ paddingTop: insets.top }}>
          <OnboardingProgress current={2} className="mt-4" />
          <AppText variant="overline" tone="primary" className="mt-5 tracking-[0.4px]">
            VOICE ACCESS · 2 OF 3
          </AppText>

          {isDenied ? (
            <>
              <AppText
                accessibilityRole="header"
                className="mt-4 font-display text-[34px] leading-[40px] text-ink"
              >
                Microphone{"\n"}access is off.
              </AppText>
              <AppText tone="muted" className="mt-3 text-[16px] leading-[22px]">
                {isWeb
                  ? "Microphone access is off. Allow microphone access in your browser address bar to continue."
                  : isPermissionBlocked
                    ? "Microphone access is off. Shake to open Hear! settings and enable Microphone."
                    : "Microphone access is off. Shake again to ask for microphone access."}
              </AppText>
              <View className="my-6 h-[1px] bg-border" />
              <VoiceStatusBadge label="HEAR IS SPEAKING" className="mb-3" />
              <AppText className="font-display text-[22px] leading-[28px] text-ink">
                {isPermissionBlocked
                  ? "“Microphone access is off.\nShake device to open Hear! microphone settings.”"
                  : "“Microphone access is off.\nShake device to ask for microphone access again.”"}
              </AppText>
            </>
          ) : isVoiceTest ? (
            <>
              <AppText
                accessibilityRole="header"
                className="mt-4 font-display text-[34px] leading-[40px] text-ink"
              >
                Let’s try one command
              </AppText>
              <AppText tone="muted" className="mt-2 text-[16px] leading-[22px]">
                Hear! started listening after permission was allowed.
              </AppText>
              <PromptCard
                label="SAY THIS"
                command="“Play my local news.”"
                size="large"
                className="mt-6"
              />
            </>
          ) : (
            <>
              <AppText
                accessibilityRole="header"
                className="mt-4 font-display text-[34px] leading-[40px] text-ink"
              >
                Hear! listens only after{"\n"}you call it.
              </AppText>
              <AppText tone="muted" className="mt-3 text-[16px] leading-[22px]">
                Permission first. Listening only when invited. The microphone stops after each command.
              </AppText>
              <PromptCard
                label="SAY THIS"
                command="“Play my local news.”"
                size="large"
                className="mt-6"
              />
            </>
          )}
        </View>
      </ScrollView>

      {!isVoiceTest && (
        <LinearGradient
          colors={[colors.voiceCanvas, colors.voicePanel]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            paddingBottom: insets.bottom + 20,
          }}
          accessible={!screenReaderEnabled}
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className="mt-3 h-1 w-[64px] self-center rounded-full bg-voice-muted opacity-65"
          />
          <View className="mt-4 sm:mt-7 px-5 sm:px-6">
            <AppText variant="overline" className="text-voice-muted tracking-[0.4px]">
              ONE GESTURE
            </AppText>
            <AppText className="mt-2 font-display text-[32px] sm:text-[38px] leading-[36px] sm:leading-[44px] text-white">
              Shake device{"\n"}to continue.
            </AppText>
            <AppText className="mt-2 text-[15px] sm:text-[16px] leading-[20px] sm:leading-[21px] text-voice-muted">
              {isDenied
                ? isPermissionBlocked
                  ? "We’ll open Hear! settings. Turn on Microphone, then return here to continue by voice."
                  : "We’ll ask for microphone access again. Allow it in the system dialog to continue by voice."
                : "Your phone will ask for microphone permission next."}
            </AppText>
            {isPermissionBlocked && (
              <View className="mt-5 border-t border-voice-track pt-4">
                <AppText variant="overline" className="text-voice-muted tracking-[0.4px]">
                  WHEN YOU RETURN
                </AppText>
                <AppText className="mt-1 font-body-bold text-[16px] text-white">
                  Hear! starts your first voice test automatically.
                </AppText>
              </View>
            )}
          </View>
        </LinearGradient>
      )}
    </Pressable>
  );
}
