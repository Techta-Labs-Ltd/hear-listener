import { FactListRow } from "@/components/onboarding/FactListRow";
import { InstructionFooter } from "@/components/onboarding/InstructionFooter";
import { OnboardingHero } from "@/components/onboarding/OnboardingHero";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { VoiceStatusBadge } from "@/components/voice/VoiceStatusBadge";
import { AppText } from "@/components/ui/AppText";
import { onboardingFacts } from "@/data/onboarding";
import { ScrollView } from "@/tw";
import type { VoiceAccessStepProps } from "@/types";

export function VoiceAccessStep({ screenReaderEnabled, onEnableVoice }: VoiceAccessStepProps) {
  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="flex-grow"
      showsVerticalScrollIndicator={false}
    >
      <OnboardingHero height={220}>
        <VoiceStatusBadge label="HEAR IS SPEAKING" className="mt-[19px]" />
        <AppText className="mt-[22px] font-display text-[34px] leading-[41px] text-white">
          Your voice stays yours.
        </AppText>
        <AppText className="mt-[10px] text-[15px] leading-[18px] text-voice-muted">
          Permission first. Listening only when invited.
        </AppText>
      </OnboardingHero>
      <OnboardingProgress current={2} className="mx-6 mt-[34px]" />
      <AppText variant="overline" tone="primary" className="mx-6 mt-[26px] tracking-[0.4px]">
        VOICE ACCESS · 2 OF 3
      </AppText>
      <AppText
        accessibilityRole="header"
        accessibilityActions={[{ name: "enableVoice", label: "Show microphone access" }]}
        accessibilityHint="Requests microphone and speech access, then listens for one command."
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "enableVoice") onEnableVoice();
        }}
        className="mx-6 mt-[28px] font-display text-[30px] leading-9 text-ink"
      >
        Hear listens only after{"\n"}you call it.
      </AppText>
      {onboardingFacts.map((fact, index) => (
        <FactListRow
          key={fact.title}
          title={fact.title}
          description={fact.description}
          className={index === 0 ? "mx-6 mt-[46px]" : "mx-6 mt-[28px]"}
        />
      ))}
      <InstructionFooter
        className="mx-6 mt-[40px] mb-10"
        title="Double-tap to show microphone access"
        subtitle={
          screenReaderEnabled
            ? "Or activate “Show microphone access,” then choose Allow in your phone’s permission dialog."
            : "Then choose Allow in your phone’s permission dialog."
        }
        notes={["Say “repeat” after access is granted to hear this again."]}
      />
    </ScrollView>
  );
}
