import { SymbolView } from "@/components/ui/AppIcon";
import { AppText } from "./AppText";
import { Pressable, View } from "@/tw";
import { colors } from "@/constants/theme";
import type { EmptyStateProps } from "@/types";

export function EmptyState({
  title,
  description,
  icon = "tray",
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="items-center justify-center px-4 py-12 sm:py-16 text-center">
      <View className="h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-primary-soft">
        <SymbolView name={icon as never} size={32} tintColor={colors.primary} />
      </View>
      <AppText
        accessibilityRole="header"
        className="mt-6 text-center font-display text-[22px] sm:text-[26px] leading-[28px] sm:leading-[31px] text-ink"
      >
        {title}
      </AppText>
      <AppText
        tone="muted"
        className="mt-2.5 sm:mt-3 text-center text-xs sm:text-sm leading-[17px] max-w-[290px]"
      >
        {description}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          className="mt-7 sm:mt-8 h-12 w-full max-w-[260px] items-center justify-center rounded-full bg-voice-canvas active:opacity-75"
        >
          <AppText className="font-body-bold text-[14px] leading-[18px] text-white">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
