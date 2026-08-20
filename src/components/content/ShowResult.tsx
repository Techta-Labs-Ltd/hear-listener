import { AppText } from "@/components/ui/AppText";
import { Pressable, View } from "@/tw";
import type { Entity } from "@/types";

export function ShowResult({
  entity,
  onPlay,
}: {
  entity: Entity;
  onPlay: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entity.name}, ${entity.kind}`}
      accessibilityHint="Plays a story from this show."
      onPress={onPlay}
      className="flex-row items-center gap-3.5 sm:gap-4 rounded-[22px] border border-border/60 bg-surface p-3.5 shadow-sm active:opacity-90"
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="h-[74px] w-[74px] sm:h-[80px] sm:w-[80px] items-center justify-center rounded-[18px]"
        style={{ backgroundColor: "#6B58A8" }}
      />
      <View className="flex-1 gap-1">
        <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
          {entity.kind === "creator" ? "CREATOR" : "SHOW"}
        </AppText>
        <AppText
          className="font-body-bold text-[15px] sm:text-base leading-[19px] text-ink"
          numberOfLines={1}
        >
          {entity.name}
        </AppText>
        <AppText
          tone="muted"
          className="text-xs sm:text-[13px] leading-4 text-[#665F69]"
          numberOfLines={1}
        >
          {entity.description}
        </AppText>
      </View>
    </Pressable>
  );
}
