import { useRouter } from "expo-router";
import { AppText } from "@/components/ui/AppText";
import { Pressable, View } from "@/tw";
import { usePlayback } from "@/stores";
import { routes } from "@/navigation/routes";
import type { StoryTileProps } from "@/types";
import { cn } from "@/utils/styles";

export function StoryTile({ item, className }: StoryTileProps) {
  const router = useRouter();
  const playback = usePlayback();
  const topic = (item.topicIds?.[0] ?? item.category).toUpperCase();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Play ${item.title}`}
      accessibilityHint={`Plays ${item.title} and opens the player.`}
      onPress={() => {
        playback.play(item);
        router.push(routes.player);
      }}
      className={cn(
        "flex-1 rounded-[20px] border border-border/60 bg-surface p-3 shadow-sm active:opacity-90",
        className,
      )}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="h-[120px] w-full items-center justify-center rounded-[14px]"
        style={{ backgroundColor: item.color || "#0F7B7A" }}
      >
        <AppText className="font-display text-[22px] font-bold tracking-wider text-white">
          {topic}
        </AppText>
      </View>
      <View className="pt-3 pb-1">
        <AppText
          className="font-body-bold text-[14px] leading-[18px] text-ink"
          numberOfLines={2}
        >
          {item.title}
        </AppText>
        <AppText tone="muted" className="mt-1.5 text-[12px] leading-4 text-[#665F69]" numberOfLines={1}>
          {item.duration} · {item.creator}
        </AppText>
      </View>
    </Pressable>
  );
}
