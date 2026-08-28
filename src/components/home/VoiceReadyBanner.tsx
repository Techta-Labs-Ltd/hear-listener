import { AppText } from "@/components/ui/AppText";
import { Pressable } from "@/tw";
import { triggerVoice } from "@/services/voice/events";
import type { VoiceReadyBannerProps } from "@/types";
import { homeCopy } from "@/utils/copy/home";
import { cn } from "@/utils/styles";

export function VoiceReadyBanner({ className }: VoiceReadyBannerProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${homeCopy.voiceReadyEyebrow}. ${homeCopy.voiceReadyTitle}, then ${homeCopy.voiceReadyExample}`}
      accessibilityHint="Shake device to start voice control."
      onPress={() => triggerVoice("contextualAction")}
      className={cn(
        "rounded-[16px] bg-primary-soft p-4 sm:p-5 active:opacity-90",
        className,
      )}
    >
      <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
        {homeCopy.voiceReadyEyebrow}
      </AppText>
      <AppText className="mt-3 sm:mt-[19px] font-body-bold text-[15px] sm:text-base leading-5 text-ink">
        {homeCopy.voiceReadyTitle}
      </AppText>
      <AppText tone="muted" className="mt-1 sm:mt-[6px] text-xs sm:text-sm leading-[16px] sm:leading-[17px]">
        {homeCopy.voiceReadyExample}
      </AppText>
    </Pressable>
  );
}
