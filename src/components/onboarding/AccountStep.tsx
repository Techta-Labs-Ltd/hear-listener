import { InstructionFooter } from "@/components/onboarding/InstructionFooter";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import {
  AppleSignInButton,
  GoogleSignInButton,
} from "@/components/onboarding/ProviderButtons";
import { AppText } from "@/components/ui/AppText";
import { Pressable, ScrollView, View } from "@/tw";
import type { AccountStepProps } from "@/types";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function AccountStep({
  screenReaderEnabled,
  signingIn,
  error,
  onSignIn,
  onSkip,
}: AccountStepProps) {
  const insets = useSafeAreaInsets();
  const isIos = Platform.OS === "ios";

  return (
    <View className="flex-1 bg-canvas justify-between">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-6"
        showsVerticalScrollIndicator={false}
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

      <View className="px-6 pb-6">
        <InstructionFooter
          title={
            screenReaderEnabled
              ? "Select an option above to continue"
              : isIos
                ? "Choose Apple or select Not now"
                : "Choose Google or select Not now"
          }
          subtitle="Shake device to speak. You can also sign in anytime in Settings."
        />
      </View>
    </View>
  );
}
