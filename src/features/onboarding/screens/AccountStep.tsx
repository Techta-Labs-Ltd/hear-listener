import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { VoiceStatusBadge } from "@/components/onboarding/VoiceStatusBadge";
import { AppleSignInButton, GoogleSignInButton } from "@/components/onboarding/ProviderButtons";
import { InstructionFooter } from "@/components/onboarding/InstructionFooter";
import { Pressable, ScrollView, View } from "@/tw";
import type { AccountStepProps } from "@/types";

export function AccountStep({ signingIn, error, onSignIn, onSkip }: AccountStepProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="flex-grow"
      showsVerticalScrollIndicator={false}
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
        <View className="mt-[34px] gap-4 rounded-[24px] bg-voice-panel p-[22px]">
          <VoiceStatusBadge label="HEAR IS LISTENING" />
          <AppText className="font-body-bold text-base leading-5 text-white">
            Say “Apple,” “Google,” or “Not now.”
          </AppText>
        </View>
        <AppleSignInButton
          loading={signingIn}
          onPress={() => onSignIn("apple")}
          className="mt-[40px]"
        />
        <GoogleSignInButton
          loading={signingIn}
          onPress={() => onSignIn("google")}
          className="mt-4"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Not now"
          accessibilityHint="Skips sign-in and opens Hear without an account."
          onPress={onSkip}
          className="mt-6 min-h-12 items-center justify-center active:opacity-70"
        >
          <AppText className="font-body-bold text-base leading-5 text-primary">Not now</AppText>
        </Pressable>
        <InstructionFooter
          className="mt-[36px]"
          titleClassName="font-body-bold text-sm leading-[17px]"
          title="Voice chooses the provider."
          subtitle="Your phone completes secure authorization."
          notes={[
            "Visible provider controls remain for touch and screen readers.",
            "Use system Google and Apple components in production.",
          ]}
        />
      </View>
    </ScrollView>
  );
}
