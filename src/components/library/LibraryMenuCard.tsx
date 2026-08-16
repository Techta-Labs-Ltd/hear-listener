import { Pressable, View } from "@/tw";
import { AppText } from "@/components/ui/AppText";
import type { LibraryMenuCardProps } from "@/types";

export function LibraryMenuCard({
  title,
  detail,
  onPress,
}: LibraryMenuCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      onPress={onPress}
      className="min-h-18 flex-row items-center gap-3 border-b border-border bg-surface px-4 py-3 active:bg-primary-soft"
    >
      <View className="flex-1">
        <AppText variant="heading" className="text-[17px] leading-[22px]">
          {title}
        </AppText>
        <AppText variant="label" tone="muted">
          {detail}
        </AppText>
      </View>
      <AppText variant="overline" tone="primary">
        OPEN
      </AppText>
    </Pressable>
  );
}
