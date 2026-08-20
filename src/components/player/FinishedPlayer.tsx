import { useRouter } from "expo-router";
import { SymbolView } from "@/components/ui/AppIcon";
import { PlayerArtwork } from "@/components/player/PlayerArtwork";
import { AppScreen } from "@/components/ui/AppScreen";
import { IconButton } from "@/components/ui/IconButton";
import { AppText } from "@/components/ui/AppText";
import { Pressable, View } from "@/tw";
import { usePlayback } from "@/stores";
import { playerCopy as copy } from "@/utils/copy/player";
import { icons } from "@/utils/icons/app-icons";
import type { ContentItem } from "@/types";

export function FinishedPlayer({ current }: { current: ContentItem }) {
  const router = useRouter();
  const playback = usePlayback();

  return (
    <AppScreen
      screenTitle="Story Finished"
      screenOrientation={`Story finished: ${current.title}. Say play next, replay, or read this screen.`}
      voiceCommands={["play next", "replay", "read this screen"]}
    >
      <View className="min-h-14 flex-row items-center justify-between px-3">
        <IconButton symbol={icons.collapse} label={copy.close} onPress={router.back} />
        <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
          {copy.finishedEyebrow}
        </AppText>
        <View className="h-10 w-10" />
      </View>
      <View className="flex-1 items-center justify-between px-6 pb-8 pt-1">
        <View className="flex-1 items-center justify-center">
          <PlayerArtwork item={current} size="finished" className="mt-1" />
          <View className="mt-3.5 h-11 w-11 items-center justify-center rounded-full bg-[#e6f1ef]">
            <SymbolView name={icons.success} size={20} tintColor="#0F6973" />
          </View>
          <AppText
            accessibilityRole="header"
            className="mt-2.5 text-center font-display text-xl sm:text-2xl leading-6 sm:leading-7 text-ink"
          >
            {copy.finishedTitle}
          </AppText>
          <AppText
            tone="muted"
            className="mt-1 text-center text-[13px] leading-4 max-w-[280px]"
            numberOfLines={2}
          >
            {current.title}
          </AppText>
        </View>
        <View className="w-full max-w-[320px] items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.finishedNext}
            accessibilityHint="Plays the next story."
            onPress={playback.next}
            className="h-[52px] w-full items-center justify-center rounded-full bg-voice-canvas active:opacity-70"
          >
            <AppText className="font-body-bold text-sm leading-[17px] text-white">
              {copy.finishedNext}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.finishedReplay}
            accessibilityHint="Replays this story from the start."
            onPress={playback.restart}
            className="h-[52px] w-full items-center justify-center rounded-full border border-border bg-surface active:opacity-70"
          >
            <AppText className="font-body-bold text-sm leading-[17px] text-voice-canvas">
              {copy.finishedReplay}
            </AppText>
          </Pressable>
        </View>
      </View>
    </AppScreen>
  );
}
