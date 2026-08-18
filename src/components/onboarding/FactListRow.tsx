import { AppText } from "@/components/ui/AppText";
import { View } from "@/tw";
import type { FactListRowProps } from "@/types";
import { cn } from "@/utils/styles";

export function FactListRow({ title, description, hideDivider = false, className }: FactListRowProps) {
  return (
    <View className={className}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className={cn("border-t border-border-strong", hideDivider && "border-transparent")}
      />
      <AppText className="mt-[19px] font-body-bold text-base leading-5 text-ink">
        {title}
      </AppText>
      <AppText tone="muted" className="mt-[7px] text-[15px] leading-[18px]">
        {description}
      </AppText>
    </View>
  );
}
