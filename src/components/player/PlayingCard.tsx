import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "@/components/ui/AppIcon";
import { AppText } from "@/components/ui/AppText";
import { artworkGradient } from "@/utils/artwork";
import { View } from "@/tw";
import { usePlayback } from "@/stores";
import { stories } from "@/data/catalogue";
import type { ContentItem } from "@/types";
import { formatClock } from "@/utils/text";
import { icons } from "@/utils/icons/app-icons";

export function PlayingCard({ item }: { item: ContentItem }) {
  const playback = usePlayback();
  const remaining = formatClock(
    Math.max(0, (1 - playback.progress) * playback.durationSeconds),
  );
  const index = stories.findIndex((story) => story.id === item.id);
  const gradient = artworkGradient(Math.max(0, index));

  return (
    <View className="mt-[21px] flex-row items-center gap-[14px] rounded-[20px] bg-voice-panel p-3">
      <View className="h-20 w-20 overflow-hidden rounded-[12px]">
        <LinearGradient
          colors={[gradient[0], gradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        />
      </View>
      <View className="flex-1 gap-1.5">
        <AppText className="font-body-bold text-[13px] leading-4 text-white" numberOfLines={1}>
          {item.title}
        </AppText>
        <AppText className="text-[11px] leading-[13px] text-voice-muted">
          {remaining} left
        </AppText>
      </View>
      <SymbolView name={icons.pause} size={18} tintColor="#CDB2EB" />
    </View>
  );
}
