import { AppText } from "@/components/ui/AppText";
import { View } from "@/tw";
import type { VoiceTipProps } from "@/types";
import { cn } from "@/utils/styles";

export function VoiceTip({ eyebrow, text, tone = "default", className }: VoiceTipProps) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${eyebrow}. ${text}`}
      className={cn(
        "rounded-[16px] p-5",
        tone === "mint" ? "bg-[#e6f1ef]" : "bg-primary-soft",
        className,
      )}
    >
      <AppText
        variant="overline"
        className={cn(
          "tracking-[0.4px]",
          tone === "mint" ? "text-[#0f6973]" : "text-primary",
        )}
      >
        {eyebrow}
      </AppText>
      <AppText
        className={cn(
          "mt-2 text-[13px] leading-4",
          tone === "mint" ? "text-[#21484c]" : "text-ink",
        )}
      >
        {text}
      </AppText>
    </View>
  );
}
