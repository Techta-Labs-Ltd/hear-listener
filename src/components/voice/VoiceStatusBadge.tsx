import { AppText } from "@/components/ui/AppText";
import { View } from "@/tw";
import type { VoiceStatusBadgeProps } from "@/types";
import { cn } from "@/utils/styles";

export function VoiceStatusBadge({ label, className }: VoiceStatusBadgeProps) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      className={cn("flex-row items-center gap-3", className)}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="h-2.5 w-2.5 rounded-full bg-voice-indicator"
      />
      <AppText
        variant="overline"
        className="text-[13px] leading-4 tracking-[0.4px] text-voice-muted"
      >
        {label}
      </AppText>
    </View>
  );
}
