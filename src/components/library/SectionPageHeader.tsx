import { SymbolView } from "@/components/ui/AppIcon";
import { AppText } from "@/components/ui/AppText";
import { colors } from "@/constants/theme";
import { Pressable, View } from "@/tw";
import type { SectionPageHeaderProps } from "@/types";
import { icons } from "@/utils/icons/app-icons";
import { cn } from "@/utils/styles";

export function SectionPageHeader({
  eyebrow,
  title,
  subtitle,
  subtitleClassName,
  small = false,
  backLabel,
  onBack,
}: SectionPageHeaderProps) {
  return (
    <>
      <View className="flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          accessibilityHint="Returns to the Library hub."
          onPress={onBack}
          hitSlop={6}
          className="-ml-2 h-12 w-12 justify-center active:opacity-70"
        >
          <SymbolView name={icons.back} size={24} tintColor={colors.text} />
        </Pressable>
        {small ? (
          <View className="flex-1 items-center gap-1 pr-10">
            <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
              {eyebrow}
            </AppText>
            <AppText className="font-body-bold text-sm leading-[17px] text-ink">
              {title}
            </AppText>
          </View>
        ) : (
          <AppText
            variant="overline"
            tone="primary"
            className="flex-1 pr-10 text-center tracking-[0.4px]"
          >
            {eyebrow}
          </AppText>
        )}
      </View>
      {small ? null : (
        <AppText
          accessibilityRole="header"
          className="mt-[13px] font-display text-[30px] leading-9 text-ink"
        >
          {title}
        </AppText>
      )}
      {small ? null : subtitle ? (
        <AppText tone="muted" className={cn("mt-[9px] text-xs leading-[15px]", subtitleClassName)}>
          {subtitle}
        </AppText>
      ) : null}
    </>
  );
}
