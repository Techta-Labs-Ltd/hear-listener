import { useRouter } from "expo-router";
import { Pressable, View } from "@/tw";
import { ProgressTrack } from "@/components/player/ProgressTrack";
import { usePlayback } from "@/stores";
import type { StoryCardProps } from "@/types";
import { routes } from "@/navigation/routes";
import { AppText } from "../ui/AppText";
import { cn } from "@/utils/styles";

export function StoryCard({
  item,
  compact = false,
}: StoryCardProps) {
  const router = useRouter();
  const playback = usePlayback();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Play ${item.title}`}
      accessibilityHint={`Plays ${item.title} and opens the player.`}
      accessibilityValue={
        item.progress !== undefined
          ? { text: `${Math.round(item.progress * 100)} percent listened` }
          : undefined
      }
      onPress={() => {
        playback.play(item);
        router.push(routes.player);
      }}
      className={cn(
        "min-h-26 flex-row items-center gap-3 rounded-card border border-border bg-surface p-2",
        compact && "min-h-19 rounded-none border-0 border-b",
      )}
    >
      <View
        className={cn(
          "h-[84px] w-18 items-center justify-center rounded-[10px]",
          compact && "h-13 w-13",
        )}
        style={{ backgroundColor: item.color }}
      >
        <AppText tone="inverse" variant="overline">
          {item.category.toUpperCase()}
        </AppText>
      </View>
      <View className="flex-1">
        <AppText tone="primary" variant="overline">
          {item.duration.toUpperCase()}
        </AppText>
        <AppText variant="label" className="my-1 font-display text-ink" numberOfLines={2}>
          {item.title}
        </AppText>
        <AppText tone="muted" variant="label" numberOfLines={1}>
          {item.creator} · {item.publication}
        </AppText>
        {item.progress ? (
          <ProgressTrack progress={item.progress} className="mt-2" />
        ) : null}
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="h-10 w-10 items-center justify-center rounded-full bg-primary"
      >
        <AppText tone="inverse">▶</AppText>
      </View>
    </Pressable>
  );
}
