import { useRouter } from "expo-router";
import { SymbolView } from "@/components/ui/AppIcon";
import { PlayerArtwork } from "@/components/player/PlayerArtwork";
import { AppScreen } from "@/components/ui/AppScreen";
import { IconButton } from "@/components/ui/IconButton";
import { AppText } from "@/components/ui/AppText";
import { Pressable, ScrollView, View } from "@/tw";
import { colors } from "@/constants/theme";
import { usePlayback, usePreferences } from "@/stores";
import { useKineticGestures } from "@/hooks/useKineticGestures";
import { formatClock } from "@/utils/text";
import { routes } from "@/navigation/routes";
import { playerCopy as copy, queueCopy } from "@/utils/copy/player";
import { icons } from "@/utils/icons/app-icons";
import type { ContentItem } from "@/types";

export function PlayingPlayer({ current }: { current: ContentItem }) {
  const router = useRouter();
  const playback = usePlayback();
  const { preferences, updatePreferences } = usePreferences();

  useKineticGestures({
    onNext: () => playback.seekBy(15),
    onPrevious: () => playback.seekBy(-15),
  });

  const saved = preferences.savedIds.includes(current.id);
  const durationSeconds = playback.durationSeconds || 18 * 60;
  const buffering = playback.playing && playback.progress === 0;
  const elapsed = formatClock(playback.progress * durationSeconds);
  const total = formatClock(durationSeconds);
  const progressWidth = `${Math.min(100, playback.progress * 100)}%` as `${number}%`;

  return (
    <AppScreen
      screenTitle="Audio Player"
      screenOrientation={`Playing ${current.title} by ${current.creator}. Say pause, skip, speed up, or read this screen.`}
      voiceCommands={[
        "pause",
        "resume",
        "skip 30 seconds",
        "set sleep timer to 15 minutes",
        "save story",
        "read this screen",
      ]}
    >
      <View className="min-h-14 flex-row items-center justify-between px-3">
        <IconButton symbol={icons.collapse} label={copy.close} onPress={router.back} />
        <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
          {copy.eyebrow}
        </AppText>
        <IconButton
          symbol={icons.queue}
          label={queueCopy.open}
          onPress={() => router.push(routes.queue)}
        />
      </View>
      <ScrollView
        contentContainerClassName="flex-grow justify-between gap-4 px-6 pb-6 pt-1"
        showsVerticalScrollIndicator={false}
      >
        <PlayerArtwork item={current} />
        <View className="items-center gap-1.5">
          <AppText
            accessibilityRole="header"
            className="text-center font-display text-[20px] sm:text-[22px] leading-[25px] sm:leading-[26px] text-ink"
            numberOfLines={2}
          >
            {current.title}
          </AppText>
          <AppText tone="muted" className="text-[12px] sm:text-[13px] leading-4">
            {current.creator} · {current.publication}
          </AppText>
        </View>
        <View className="gap-[10px]">
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Playback position"
            accessibilityValue={{
              min: 0,
              max: 100,
              now: Math.round(playback.progress * 100),
            }}
          >
            <View className="h-[5px] rounded-full bg-border">
              <View
                className="h-full rounded-full bg-primary"
                style={{ width: progressWidth }}
              />
            </View>
            <View
              className="absolute -top-[4.5px] h-[14px] w-[14px] rounded-full bg-primary"
              style={{ left: progressWidth, marginLeft: -7 }}
            />
          </View>
          <View className="flex-row justify-between">
            <AppText tone="muted" className="text-[11px] leading-[13px]">
              {elapsed}
            </AppText>
            <AppText tone="muted" className="text-[11px] leading-[13px]">
              {total}
            </AppText>
          </View>
        </View>
        {buffering ? (
          <View className="items-center gap-3 py-2">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                className="h-[42px] w-[42px] rounded-full border-4 border-primary"
              />
            </View>
            <AppText className="font-body-bold text-[13px] leading-4 text-primary">
              {copy.buffering}
            </AppText>
            <AppText className="text-[11px] leading-[13px] text-muted">
              {copy.bufferingVoice}
            </AppText>
          </View>
        ) : (
          <View className="flex-row items-center justify-center gap-10">
            <IconButton
              symbol={icons.rewind}
              label={copy.rewind}
              onPress={() => playback.seekBy(-15)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={playback.playing ? copy.pause : copy.play}
              accessibilityHint={
                playback.playing ? "Pauses playback." : "Resumes playback."
              }
              onPress={playback.toggle}
              className="h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-voice-canvas active:opacity-90"
            >
              <SymbolView
                name={playback.playing ? icons.pause : icons.play}
                size={26}
                tintColor={colors.surface}
              />
            </Pressable>
            <IconButton
              symbol={icons.forward}
              label={copy.forward}
              onPress={() => playback.seekBy(15)}
            />
          </View>
        )}
        <View className="flex-row items-center justify-between px-3 sm:px-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Playback speed ${playback.speed}x`}
            accessibilityHint="Changes the playback speed."
            onPress={() => playback.stepSpeed("up")}
            className="h-10 min-w-[70px] items-center justify-center rounded-full bg-surface px-3 sm:px-4 border border-border active:opacity-90"
          >
            <AppText className="font-body-bold text-xs leading-[15px] text-voice-canvas">
              {playback.speed}×
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sleep timer"
            accessibilityHint="Opens the sleep timer options."
            onPress={() => router.push(routes.sleepTimer)}
            className="h-10 items-center justify-center rounded-full bg-surface px-3 sm:px-4 border border-border/60 active:opacity-70 shadow-sm"
          >
            <AppText className="font-body-bold text-xs leading-[15px] text-voice-canvas">
              {copy.sleep}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? copy.saved : copy.save}
            accessibilityHint={
              saved ? "Already saved to your Library." : "Saves to your Library."
            }
            onPress={() =>
              !saved &&
              updatePreferences({ savedIds: [...preferences.savedIds, current.id] })
            }
            className="h-10 items-center justify-center rounded-full bg-surface px-3 sm:px-4 border border-border/60 active:opacity-70 shadow-sm"
          >
            <AppText className="font-body-bold text-xs leading-[15px] text-voice-canvas">
              {saved ? copy.saved : copy.save}
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </AppScreen>
  );
}
