import { Pressable, View } from "@/tw";
import { AppText } from "./AppText";
import type { SectionHeaderProps } from "@/types";
export function SectionHeader({
  eyebrow,
  title,
  onAction,
}: SectionHeaderProps) {
  return (
    <View className="mb-2 flex-row items-end justify-between">
      <View>
        <AppText variant="overline" tone="primary">
          {eyebrow}
        </AppText>
        <AppText variant="heading">{title}</AppText>
      </View>
      {onAction && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`See all ${title}`}
          onPress={onAction}
        >
          <AppText variant="label" tone="primary" className="p-3">
            See all
          </AppText>
        </Pressable>
      )}
    </View>
  );
}
