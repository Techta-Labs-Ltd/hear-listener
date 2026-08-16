import { SymbolView } from "@/components/ui/AppIcon";
import { useRouter } from "expo-router";
import { Pressable, View } from "@/tw";
import { ProgressTrack } from "@/components/player/ProgressTrack";
import { AppScreen } from "@/components/ui/AppScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { AppText } from "@/components/ui/AppText";
import { colors } from "@/constants/theme";
import { usePlayback, usePreferences } from "@/stores";
import { formatClock } from "@/utils/text";
import { routes } from "@/navigation/routes";
import { playerCopy as copy } from "@/utils/copy/player";
import { icons } from "@/utils/icons/app-icons";

export function PlayerScreen() {
  const router = useRouter();
  const playback = usePlayback();
  const { preferences, updatePreferences } = usePreferences();
  const current = playback.current;

  if (!current) {
    return (
      <AppScreen>
        <View className="flex-1 items-center justify-center gap-4 p-6">
          <EmptyState
            icon={icons.playEmpty}
            title={copy.emptyTitle}
            description={copy.emptyDescription}
            actionLabel={copy.backHome}
            onAction={() => router.replace(routes.home)}
          />
        </View>
      </AppScreen>
    );
  }

  const saved = preferences.savedIds.includes(current.id);
  const durationSeconds = playback.durationSeconds || 18 * 60;

  return (
    <AppScreen>
      <View className="min-h-16 flex-row items-center justify-between px-3">
        <IconButton
          symbol={icons.collapse}
          label={copy.close}
          onPress={router.back}
        />
        <AppText variant="overline" tone="primary">
          {copy.eyebrow}
        </AppText>
        <View className="h-12 w-12" />
      </View>
      <View className="w-full max-w-[560px] flex-1 self-center gap-6 p-6">
        <View className="aspect-square w-full max-h-[380px] items-center justify-center rounded-panel" style={{ backgroundColor: current.color }}>
          <AppText variant="title" tone="inverse">
            {current.category}
          </AppText>
        </View>
        <View className="items-center gap-2">
          <AppText variant="title" className="text-center">
            {current.title}
          </AppText>
          <AppText tone="muted">
            {current.creator} · {current.publication}
          </AppText>
        </View>
        <View className="gap-2">
          <ProgressTrack progress={playback.progress} height={5} />
          <View className="flex-row justify-between">
            <AppText variant="label" tone="muted">
              {formatClock(playback.progress * durationSeconds)}
            </AppText>
            <AppText variant="label" tone="muted">
              {formatClock(durationSeconds)}
            </AppText>
          </View>
        </View>
        <View className="flex-row items-center justify-center gap-6">
          <IconButton
            symbol={icons.rewind}
            label={copy.rewind}
            onPress={() => playback.seekBy(-15)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playback.playing ? copy.pause : copy.play}
            onPress={playback.toggle}
            className="h-18 w-18 items-center justify-center rounded-full bg-primary"
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
        <View className="flex-row items-center justify-center gap-4">
          <View className="rounded-full bg-primary-soft px-3 py-1">
            <AppText variant="label" tone="muted">
              {playback.speed}x
            </AppText>
          </View>
          <Button
            label={playback.repeat ? copy.repeatOn : copy.repeatOff}
            variant="ghost"
            onPress={() => playback.setRepeat(playback.repeat ? "off" : "on")}
          />
        </View>
        <Button
          label={saved ? copy.saved : copy.save}
          variant="secondary"
          onPress={() =>
            !saved &&
            updatePreferences({
              savedIds: [...preferences.savedIds, current.id],
            })
          }
        />
      </View>
    </AppScreen>
  );
}
