import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import {
  AppleSignInButton,
  GoogleSignInButton,
} from "@/components/onboarding/ProviderButtons";
import { InstructionFooter } from "@/components/onboarding/InstructionFooter";
import { ListeningPanel } from "@/components/voice/ListeningPanel";
import { Pressable, ScrollView, View } from "@/tw";
import type { AccountStepProps } from "@/types";

export function AccountStep({
  screenReaderEnabled,
  signingIn,
  error,
  voiceState,
  voiceMessage,
  transcript,
  deadlineAt,
  speechDetected,
  onSignIn,
  onSkip,
  onDoubleTap,
}: AccountStepProps) {
  const insets = useSafeAreaInsets();
  const isIos = Platform.OS === "ios";
  const isVoiceActive =
    voiceState === "listening" ||
    voiceState === "resolving" ||
    voiceState === "executing" ||
    voiceState === "preparing" ||
    voiceState === "error" ||
    voiceState === "clarifying";

  return (
    <Pressable
      accessible={screenReaderEnabled}
      accessibilityRole={screenReaderEnabled ? "button" : undefined}
      accessibilityLabel={
        isIos
          ? "Optional account. Step 3 of 3. An account keeps your saved audio and listening progress with you. Say Apple, or Not now."
          : "Optional account. Step 3 of 3. An account keeps your saved audio and listening progress with you. Say Google, or Not now."
      }
      accessibilityHint="Double-tap anywhere to try voice selection again or choose an option below."
      onPress={
        screenReaderEnabled && voiceState !== "listening"
          ? onDoubleTap
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
          <OnboardingProgress current={3} className="mt-4" />
          <AppText
            variant="overline"
            tone="primary"
            className="mt-5 tracking-[0.4px]"
          >
            OPTIONAL ACCOUNT · 3 OF 3
          </AppText>
          <AppText
            accessibilityRole="header"
            className="mt-4 font-display text-[34px] leading-[40px] text-ink"
          >
            Keep your listening{"\n"}with you.
          </AppText>
          <AppText tone="muted" className="mt-3 text-[16px] leading-[22px]">
            An account syncs saved audio and progress.{"\n"}Hear works fully
            without one.
          </AppText>
          {error ? (
            <AppText
              accessibilityLiveRegion="polite"
              tone="danger"
              className="mt-4"
            >
              {error}
            </AppText>
          ) : null}

          <View className="mt-6 gap-4">
            {isIos ? (
              <AppleSignInButton
                loading={signingIn}
                onPress={() => onSignIn("apple")}
              />
            ) : (
              <GoogleSignInButton
                loading={signingIn}
                onPress={() => onSignIn("google")}
              />
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Not now"
              accessibilityHint="Skips sign-in and opens Hear without an account."
              onPress={onSkip}
              className="min-h-12 items-center justify-center rounded-2xl border border-border bg-surface px-6 active:opacity-70"
            >
              <AppText className="font-body-bold text-base text-primary">
                Not now
              </AppText>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {isVoiceActive ? (
        <View className="flex-1 justify-end" accessible={!screenReaderEnabled}>
          <ListeningPanel
            state={voiceState ?? "listening"}
            message={voiceMessage}
            transcript={transcript}
            prompt={
              isIos
                ? "Say “Apple” or “Not now.”"
                : "Say “Google” or “Not now.”"
            }
            deadlineAt={deadlineAt}
            speechDetected={speechDetected}
          />
        </View>
      ) : (
        <View className="px-6 pb-6" accessible={!screenReaderEnabled}>
          <InstructionFooter
            title={
              screenReaderEnabled
                ? "Select an option above to continue"
                : isIos
                  ? "Choose Apple or select Not now"
                  : "Choose Google or select Not now"
            }
            subtitle="Double-tap anywhere to listen again. You can also sign in anytime in Settings."
          />
        </View>
      )}
    </Pressable>
  );
}
