import { AppText } from "@/components/ui/AppText";
import { View } from "@/tw";
import type { QuickStartCardProps } from "@/types";
import { cn } from "@/utils/styles";

export function QuickStartCard({
  step,
  title,
  description,
  tone = "dark",
  className,
}: QuickStartCardProps) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Step ${step}: ${title}. ${description}`}
      className={cn(
        "flex-row items-center gap-[14px] rounded-[24px] border border-border bg-surface p-[18px]",
        className,
      )}
      style={{ minHeight: 96 }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className={cn(
          "h-12 w-12 items-center justify-center rounded-full",
          tone === "dark" ? "bg-voice-canvas" : "bg-[#f0d8c9]",
        )}
      >
        <AppText
          className={cn(
            "font-body-bold text-[15px] leading-5",
            tone === "dark" ? "text-white" : "text-[#743f32]",
          )}
        >
          {step}
        </AppText>
      </View>
      <View className="flex-1">
        <AppText className="font-body-bold text-[15px] leading-[18px] text-ink">
          {title}
        </AppText>
        <AppText tone="muted" className="mt-1 text-[13px] leading-4 text-muted" numberOfLines={2}>
          {description}
        </AppText>
      </View>
    </View>
  );
}
