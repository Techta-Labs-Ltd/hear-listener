import { useRouter } from "expo-router";
import { SymbolView } from "@/components/ui/AppIcon";
import { PlayerArtwork } from "@/components/player/PlayerArtwork";
import { AppScreen } from "@/components/ui/AppScreen";
import { IconButton } from "@/components/ui/IconButton";
import { AppText } from "@/components/ui/AppText";
import { Pressable, ScrollView, View } from "@/tw";
import { colors } from "@/constants/theme";
import { usePlayback, usePreferences } from "@/stores";
import { useVoice } from "@/hooks/useVoice";
import { formatClock } from "@/utils/text";
import { routes } from "@/navigation/routes";
import { playerCopy as copy, queueCopy } from "@/utils/copy/player";
import { icons } from "@/utils/icons/app-icons";

export function PlayerScreen() {
  const playback = usePlayback();

  if (!playback.current) return <EmptyPlayer />;
  if (playback.progress >= 1) return <FinishedPlayer />;
  return <PlayingPlayer />;
}

function PlayingPlayer() {
  const router = useRouter();
  const playback = usePlayback();
  const { preferences, updatePreferences } = usePreferences();
  const current = playback.current;
  if (!current) return null;

  const saved = preferences.savedIds.includes(current.id);
  const durationSeconds = playback.durationSeconds || 18 * 60;
  const buffering = playback.playing && playback.progress === 0;
  const elapsed = formatClock(playback.progress * durationSeconds);
  const total = formatClock(durationSeconds);
  const progressWidth = `${Math.min(100, playback.progress * 100)}%` as `${number}%`;

  return (
    <AppScreen>
      <View className="min-h-16 flex-row items-center justify-between px-3">
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
        contentContainerClassName="gap-6 px-6 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <PlayerArtwork item={current} />
        <View className="items-center gap-2">
          <AppText
            accessibilityRole="header"
            className="text-center font-display text-[22px] leading-[26px] text-ink"
          >
            {current.title}
          </AppText>
          <AppText tone="muted" className="text-[13px] leading-4">
            {current.creator} · {current.publication}
          </AppText>
        </View>
        <View className="gap-[14px]">
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
          <View className="items-center gap-4">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-primary-soft">
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                className="h-[50px] w-[50px] rounded-full border-4 border-primary"
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
          <View className="flex-row items-center justify-center gap-12">
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
              className="h-24 w-24 items-center justify-center rounded-full bg-voice-canvas active:opacity-90"
            >
              <SymbolView
                name={playback.playing ? icons.pause : icons.play}
                size={30}
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
        <View className="flex-row items-center justify-between px-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Playback speed ${playback.speed}x`}
            accessibilityHint="Changes the playback speed."
            onPress={() => playback.stepSpeed("up")}
            className="h-10 min-w-[75px] items-center justify-center rounded-full bg-surface px-4 border border-border active:opacity-90"
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
            className="h-10 items-center justify-center rounded-full bg-surface px-4 border border-border/60 active:opacity-70 shadow-sm"
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
            className="h-10 items-center justify-center rounded-full bg-surface px-4 border border-border/60 active:opacity-70 shadow-sm"
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

function EmptyPlayer() {
  const router = useRouter();
  const voice = useVoice();

  return (
    <AppScreen>
      <View className="min-h-16 flex-row items-center justify-between px-3">
        <IconButton symbol={icons.collapse} label={copy.close} onPress={router.back} />
        <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
          {copy.playerEyebrow}
        </AppText>
        <View className="h-12 w-12" />
      </View>
      <View className="flex-1 items-center px-6 pb-12">
        <View className="mt-[90px] h-[148px] w-[148px] items-center justify-center rounded-full bg-primary-soft">
          <SymbolView name={icons.playEmpty} size={56} tintColor={colors.primary} />
        </View>
        <AppText
          accessibilityRole="header"
          className="mt-[32px] font-display text-[27px] leading-[32px] text-ink"
        >
          {copy.emptyTitle}
        </AppText>
        <AppText tone="muted" className="mt-4 text-center text-sm leading-[17px]">
          {copy.emptyDescription}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.browse}
          accessibilityHint="Opens Discover."
          onPress={() => router.push(routes.discover)}
          className="mt-[45px] h-[54px] w-[274px] items-center justify-center rounded-full bg-voice-canvas active:opacity-70"
        >
          <AppText className="font-body-bold text-[15px] leading-[18px] text-white">
            {copy.browse}
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.speak}
          accessibilityHint="Starts a voice command."
          onPress={() => void voice.startVoiceSession({ source: "contextualAction" })}
          className="mt-3.5 h-[54px] w-[274px] items-center justify-center rounded-full border border-border bg-surface active:opacity-70"
        >
          <AppText className="font-body-bold text-[15px] leading-[18px] text-voice-canvas">
            {copy.speak}
          </AppText>
        </Pressable>
      </View>
    </AppScreen>
  );
}

function FinishedPlayer() {
  const router = useRouter();
  const playback = usePlayback();
  const current = playback.current;
  if (!current) return null;

  return (
    <AppScreen>
      <View className="min-h-16 flex-row items-center justify-between px-3">
        <IconButton symbol={icons.collapse} label={copy.close} onPress={router.back} />
        <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
          {copy.finishedEyebrow}
        </AppText>
        <View className="h-12 w-12" />
      </View>
      <View className="flex-1 items-center px-6 pb-12">
        <PlayerArtwork item={current} size="finished" className="mt-3" />
        <View className="mt-6 h-[62px] w-[62px] items-center justify-center rounded-full bg-[#e6f1ef]">
          <SymbolView name={icons.success} size={24} tintColor="#0F6973" />
        </View>
        <AppText
          accessibilityRole="header"
          className="mt-[13px] font-display text-2xl leading-[29px] text-ink"
        >
          {copy.finishedTitle}
        </AppText>
        <AppText tone="muted" className="mt-[10px] text-[13px] leading-4">
          {current.title}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.finishedNext}
          accessibilityHint="Plays the next story."
          onPress={playback.next}
          className="mt-[40px] h-[54px] w-[286px] items-center justify-center rounded-full bg-voice-canvas active:opacity-70"
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
          className="mt-3.5 h-[54px] w-[286px] items-center justify-center rounded-full border border-border bg-surface active:opacity-70"
        >
          <AppText className="font-body-bold text-sm leading-[17px] text-voice-canvas">
            {copy.finishedReplay}
          </AppText>
        </Pressable>
      </View>
    </AppScreen>
  );
}
