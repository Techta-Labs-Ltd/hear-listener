import { InstructionFooter } from "@/components/onboarding/InstructionFooter";
import { OnboardingHero } from "@/components/onboarding/OnboardingHero";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { PromptCard } from "@/components/onboarding/PromptCard";
import { VoiceStatusBadge } from "@/components/voice/VoiceStatusBadge";
import { AppText } from "@/components/ui/AppText";
import { ONBOARDING_SPEECH } from "@/constants/onboarding-steps";
import { Pressable, ScrollView, View } from "@/tw";
import type { WelcomeStepProps } from "@/types";

export function WelcomeStep({ screenReaderEnabled, onContinue }: WelcomeStepProps) {
  return (
    <Pressable
      accessible={screenReaderEnabled}
      accessibilityRole={screenReaderEnabled ? "button" : undefined}
      accessibilityLabel={ONBOARDING_SPEECH.welcome}
      accessibilityHint="Double tap anywhere to continue to voice setup."
      onPress={onContinue}
      className="flex-1 bg-canvas"
    >
      <OnboardingHero height={118} wash showWave>
        <AppText className="font-display text-[34px] leading-[41px] text-white">
          Hear.
        </AppText>
        <View className="flex-1" />
        <VoiceStatusBadge label="HEAR IS SPEAKING" className="mb-11" />
      </OnboardingHero>
      <ScrollView
        contentContainerClassName="flex-grow px-6 pb-10"
        showsVerticalScrollIndicator={false}
        accessible={!screenReaderEnabled}
      >
        <OnboardingProgress current={1} className="mt-[34px]" />
        <AppText variant="overline" tone="primary" className="mt-[26px] tracking-[0.4px]">
          WELCOME · 1 OF 3
        </AppText>
        <AppText
          accessibilityRole="header"
          className="mt-[18px] font-display text-[41px] leading-[49px] text-ink"
        >
          Hear what matters.{"\n"}Skip the screens.
        </AppText>
        <AppText tone="muted" className="mt-[23px] text-[17px] leading-[21px]">
          Hear helps you listen and use the app without needing to see the screen.
        </AppText>
        <PromptCard label="EXAMPLE" command="“Play my local news.”" className="mt-[38px]" />
        <InstructionFooter
          className="mt-[46px]"
          title="Double-tap anywhere"
          subtitle={
            screenReaderEnabled
              ? "to begin voice setup. Hear will guide you aloud."
              : "to begin voice setup. Hear will guide you aloud."
          }
          notes={screenReaderEnabled ? ["Screen reader: double-tap anywhere to continue."] : undefined}
        />
      </ScrollView>
    </Pressable>
  );
}
