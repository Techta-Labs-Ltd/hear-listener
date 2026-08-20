import { AppText } from "@/components/ui/AppText";
import { Pressable, View } from "@/tw";
import { usePlayback } from "@/stores";
import type { ContentItem } from "@/types";

export function QueueRow({ item }: { item: ContentItem }) {
  const playback = usePlayback();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Play ${item.title} next`}
      accessibilityHint="Plays this queued story."
      onPress={() => playback.play(item)}
      className="flex-row items-center gap-4 rounded-[16px] border border-border bg-surface p-5 active:opacity-90"
    >
      <View className="flex-1 gap-1.5">
        <AppText className="font-body-bold text-[13px] leading-4 text-ink" numberOfLines={1}>
          {item.title}
        </AppText>
        <AppText tone="muted" className="text-[11px] leading-[13px]" numberOfLines={1}>
          {item.duration} · {item.creator}
        </AppText>
      </View>
      <AppText accessibilityElementsHidden className="text-lg leading-[22px] text-muted">
        ≡
      </AppText>
    </Pressable>
  );
}
