import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { ListeningPanel } from "@/components/onboarding/ListeningPanel";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { PromptCard } from "@/components/onboarding/PromptCard";
import { ScrollView, View } from "@/tw";
import type { VoiceTestStepProps } from "@/types";

export function VoiceTestStep({ voiceState, voiceMessage }: VoiceTestStepProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6" style={{ paddingTop: insets.top }}>
          <OnboardingProgress current={2} className="mt-[31px]" />
          <AppText variant="overline" tone="primary" className="mt-[28px] tracking-[0.4px]">
            VOICE ACCESS · 2 OF 3
          </AppText>
          <AppText
            accessibilityRole="header"
            className="mt-[23px] font-display text-[34px] leading-[41px] text-ink"
          >
            Let’s try one command.
          </AppText>
          <AppText tone="muted" className="mt-[13px] text-base leading-5">
            Hear started listening after permission was allowed.
          </AppText>
          <PromptCard
            label="SAY THIS"
            command="“Play my local news.”"
            size="large"
            className="mt-[38px]"
          />
        </View>
        <View className="mt-[38px] flex-1">
          <ListeningPanel state={voiceState} message={voiceMessage} />
        </View>
      </ScrollView>
    </View>
  );
}
