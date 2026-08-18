import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "@/components/ui/AppIcon";
import { VoiceTip } from "@/components/voice/VoiceTip";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppText } from "@/components/ui/AppText";
import { artworkGradient } from "@/components/player/PlayerArtwork";
import { Pressable, ScrollView, View } from "@/tw";
import { colors } from "@/constants/theme";
import { usePlayback } from "@/stores";
import { stories } from "@/data/catalogue";
import type { ContentItem } from "@/types";
import { formatClock } from "@/utils/text";
import { icons } from "@/utils/icons/app-icons";
import { queueCopy as copy } from "@/utils/copy/player";

export function QueueScreen() {
  const router = useRouter();
  const playback = usePlayback();
  const current = playback.current;

  return (
    <View className="flex-1 bg-canvas">
      <View className="flex-row items-center px-5 pt-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.back}
          accessibilityHint="Returns to the player."
          onPress={router.back}
          hitSlop={6}
          className="-ml-2 h-12 w-12 justify-center active:opacity-70"
        >
          <SymbolView name={icons.back} size={24} tintColor={colors.text} />
        </Pressable>
        <AppText className="flex-1 pr-10 text-center font-body-bold text-sm leading-[17px] text-ink">
          {copy.title}
        </AppText>
      </View>
      <ScrollView
        contentContainerClassName="px-5 pt-5 pb-12"
        showsVerticalScrollIndicator={false}
      >
        {current ? (
          <>
            <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
              {copy.playingEyebrow}
            </AppText>
            <PlayingCard item={current} />
            <AppText
              accessibilityRole="header"
              className="mt-[25px] font-display text-xl leading-6 text-ink"
            >
              {copy.nextTitle}
            </AppText>
            {playback.queue.length ? (
              <View className="mt-3 gap-3">
                {playback.queue.map((item, index) => (
                  <QueueRow key={`${item.id}-${index}`} item={item} />
                ))}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear queue"
                  accessibilityHint="Removes all queued stories."
                  onPress={playback.clearQueue}
                  className="min-h-12 self-start justify-center active:opacity-70"
                >
                  <AppText className="font-body-bold text-xs leading-[15px] text-[#a64e55]">
                    {copy.clear}
                  </AppText>
                </Pressable>
              </View>
            ) : (
              <EmptyState
                icon={icons.playEmpty}
                title={copy.emptyTitle}
                description={copy.emptyDescription}
              />
            )}
            <VoiceTip eyebrow={copy.voiceEyebrow} text={copy.voiceText} className="mt-6" />
          </>
        ) : (
          <EmptyState
            icon={icons.playEmpty}
            title={copy.emptyTitle}
            description={copy.emptyDescription}
          />
        )}
      </ScrollView>
    </View>
  );
}

function PlayingCard({ item }: { item: ContentItem }) {
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

function QueueRow({ item }: { item: ContentItem }) {
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
