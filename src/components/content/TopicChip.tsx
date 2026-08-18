import { AppText } from "@/components/ui/AppText";
import { Pressable } from "@/tw";
import type { TopicChipProps } from "@/types";

export function TopicChip({ topic, count, accent, onPress }: TopicChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${topic.name}, ${count} stories`}
      accessibilityHint={`Opens the ${topic.name} topic.`}
      onPress={onPress}
      className="h-[74px] w-[114px] justify-center gap-3 rounded-[16px] border border-border/60 bg-surface px-4 shadow-sm active:opacity-90"
    >
      <AppText className="font-body-bold text-[13px] leading-4 text-ink" numberOfLines={1}>
        {topic.name}
      </AppText>
      <AppText className="text-[11px] leading-[13px]" style={{ color: accent }} numberOfLines={1}>
        {count} stories →
      </AppText>
    </Pressable>
  );
}
