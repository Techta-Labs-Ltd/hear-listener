import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { AppleSignInButton, GoogleSignInButton } from "@/components/onboarding/ProviderButtons";
import { InstructionFooter } from "@/components/onboarding/InstructionFooter";
import { Pressable, ScrollView, View } from "@/tw";
import type { AccountStepProps } from "@/types";

export function AccountStep({
  screenReaderEnabled,
  signingIn,
  error,
  onSignIn,
  onSkip,
  onDoubleTap,
}: AccountStepProps) {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessible={screenReaderEnabled}
      accessibilityRole={screenReaderEnabled ? "button" : undefined}
      accessibilityLabel="Optional account. Step 3 of 3. An account keeps your saved audio and listening progress with you. Say Apple, Google, or Not now."
      accessibilityHint="Double-tap anywhere to try voice selection again or choose an option below."
      onPress={onDoubleTap}
      className="flex-1 bg-canvas"
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow"
        showsVerticalScrollIndicator={false}
        accessible={!screenReaderEnabled}
      >
        <View className="flex-1 px-6 pb-10" style={{ paddingTop: insets.top }}>
          <OnboardingProgress current={3} className="mt-[31px]" />
          <AppText variant="overline" tone="primary" className="mt-[28px] tracking-[0.4px]">
            OPTIONAL ACCOUNT · 3 OF 3
          </AppText>
          <AppText
            accessibilityRole="header"
            className="mt-[20px] font-display text-[37px] leading-[44px] text-ink"
          >
            Keep your listening{"\n"}with you.
          </AppText>
          <AppText tone="muted" className="mt-[23px] text-base leading-5">
            An account syncs saved audio and progress.{"\n"}Hear works fully without one.
          </AppText>
          {error ? (
            <AppText accessibilityLiveRegion="polite" tone="danger" className="mt-4">
              {error}
            </AppText>
          ) : null}

          <View className="mt-[34px] gap-4">
            <AppleSignInButton
              loading={signingIn}
              onPress={() => onSignIn("apple")}
            />
            <GoogleSignInButton
              loading={signingIn}
              onPress={() => onSignIn("google")}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Not now"
              accessibilityHint="Skips sign-in and opens Hear without an account."
              onPress={onSkip}
              className="min-h-12 items-center justify-center rounded-2xl border border-border bg-surface px-6 active:opacity-70"
            >
              <AppText className="font-body-bold text-base text-primary">Not now</AppText>
            </Pressable>
          </View>

          <View className="flex-1" />

          <InstructionFooter
            className="mt-[36px]"
            title={
              screenReaderEnabled
                ? "Select an option above to continue"
                : "Choose an account or select Not now"
            }
            subtitle="You can sign in or create an account at any time in Settings."
          />
        </View>
      </ScrollView>
    </Pressable>
  );
}
