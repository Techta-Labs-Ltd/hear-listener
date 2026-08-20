import { useRouter } from "expo-router";
import { SymbolView } from "@/components/ui/AppIcon";
import { AppScreen } from "@/components/ui/AppScreen";
import { VoiceTip } from "@/components/voice/VoiceTip";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppText } from "@/components/ui/AppText";
import { PlayingCard } from "@/components/player/PlayingCard";
import { QueueRow } from "@/components/player/QueueRow";
import { Pressable, ScrollView, View } from "@/tw";
import { colors } from "@/constants/theme";
import { usePlayback } from "@/stores";
import { icons } from "@/utils/icons/app-icons";
import { queueCopy as copy } from "@/utils/copy/player";

export function QueueScreen() {
  const router = useRouter();
  const playback = usePlayback();
  const current = playback.current;

  return (
    <AppScreen
      screenTitle="Listening Queue"
      screenOrientation="Queue. Say play next, clear queue, go back, or read this screen."
      voiceCommands={["play next", "clear queue", "go back", "read this screen"]}
    >
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
            <VoiceTip
              eyebrow={copy.voiceEyebrow}
              text={copy.voiceText}
              className="mt-6"
            />
          </>
        ) : (
          <EmptyState
            icon={icons.playEmpty}
            title={copy.emptyTitle}
            description={copy.emptyDescription}
          />
        )}
      </ScrollView>
    </AppScreen>
  );
}
