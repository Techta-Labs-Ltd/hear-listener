import { SymbolView } from "@/components/ui/AppIcon";
import { useRouter } from "expo-router";
import { Pressable, View } from "@/tw";
import { colors } from "@/constants/theme";
import { usePlayback } from "@/stores";
import { routes } from "@/navigation/routes";
import { icons } from "@/utils/icons/app-icons";
import { ProgressTrack } from "./ProgressTrack";
import { AppText } from "../ui/AppText";

export function MiniPlayer() {
  const router = useRouter();
  const playback = usePlayback();
  const current = playback.current;

  if (!current) return null;

  const playbackLabel = playback.playing ? "Pause" : "Play";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Now playing: ${current.title}${
        playback.playing ? "" : ", paused"
      }`}
      accessibilityHint="Opens the full player"
      onPress={() => router.push(routes.player)}
      className="absolute bottom-0 left-0 right-0 min-h-18 flex-row items-center gap-3 border-t border-border-strong bg-surface px-4 py-2 active:bg-primary-soft"
    >
      <View className="h-11 w-11 rounded-[10px]" style={{ backgroundColor: current.color }} />

      <View className="flex-1 gap-0.5">
        <AppText variant="label" numberOfLines={1} className="font-display">
          {current.title}
        </AppText>
        <AppText tone="muted" variant="overline" numberOfLines={1}>
          {current.creator}
        </AppText>
        <ProgressTrack progress={playback.progress} className="mt-[3px]" />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playbackLabel}
        accessibilityHint={`${playbackLabel}s the current story`}
        hitSlop={4}
        onPress={(event) => {
          event.stopPropagation();
          playback.toggle();
        }}
        className="h-12 w-12 items-center justify-center rounded-full bg-primary active:opacity-70"
      >
        <SymbolView
          name={playback.playing ? icons.pause : icons.play}
          size={18}
          tintColor={colors.surface}
        />
      </Pressable>
    </Pressable>
  );
}
