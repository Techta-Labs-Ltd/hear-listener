import { Pressable, View } from "@/tw";
import { SymbolView } from "@/components/ui/AppIcon";
import { AppText } from "@/components/ui/AppText";
import { colors, spacing } from "@/constants/theme";
import type { TopicGridProps } from "@/types";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { icons } from "@/utils/icons/app-icons";
import { cn } from "@/utils/styles";

export function TopicGrid({
  topics,
  activeId,
  onSelect,
}: TopicGridProps) {
  const { columns, contentWidth, gutter } = useResponsiveLayout();
  const columnCount = Math.min(columns, 3);
  const tileWidth =
    (contentWidth - gutter * 2 - spacing.xs * (columnCount - 1)) / columnCount;
  return (
    <View className="flex-row flex-wrap gap-2">
      {topics.map((topic) => {
        const active = topic.id === activeId;
        return (
          <Pressable
            key={topic.id}
            accessibilityRole="button"
            accessibilityLabel={`Browse ${topic.name}`}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(topic.id)}
            className={cn(
              "min-h-[92px] rounded-xl border border-border bg-surface p-3.5 active:bg-primary-soft",
              active && "border-primary bg-primary-soft",
            )}
            style={{ width: tileWidth }}
          >
            <AppText variant="heading" className="text-base">
              {topic.name}
            </AppText>
            <View className="absolute right-3.5 top-[35px]">
              <SymbolView
                name={icons.topicArrow}
                size={18}
                tintColor={colors.primary}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
