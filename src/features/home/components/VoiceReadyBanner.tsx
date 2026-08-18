import { AppText } from "@/components/ui/AppText";
import { View } from "@/tw";
import type { VoiceReadyBannerProps } from "@/types";
import { homeCopy } from "@/utils/copy/home";
import { cn } from "@/utils/styles";

export function VoiceReadyBanner({ className }: VoiceReadyBannerProps) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${homeCopy.voiceReadyEyebrow}. ${homeCopy.voiceReadyTitle}, then ${homeCopy.voiceReadyExample}`}
      className={cn("rounded-[16px] bg-primary-soft p-5", className)}
    >
      <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
        {homeCopy.voiceReadyEyebrow}
      </AppText>
      <AppText className="mt-[19px] font-body-bold text-base leading-5 text-ink">
        {homeCopy.voiceReadyTitle}
      </AppText>
      <AppText tone="muted" className="mt-[6px] text-sm leading-[17px]">
        {homeCopy.voiceReadyExample}
      </AppText>
    </View>
  );
}
