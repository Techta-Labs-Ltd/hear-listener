import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "@/components/ui/AppIcon";
import { AppText } from "@/components/ui/AppText";
import { SoundWaveBars } from "@/components/ui/SoundWaveBars";
import { colors } from "@/constants/theme";
import { routes } from "@/navigation/routes";
import { usePlayback } from "@/stores";
import { icons } from "@/utils/icons/app-icons";
import { Pressable, View } from "@/tw";
import type { ContinueListeningCardProps } from "@/types";
import { cn } from "@/utils/styles";

const isWeb = Platform.OS === "web";

export function ContinueListeningCard({
  item,
  className,
}: ContinueListeningCardProps) {
  const router = useRouter();
  const playback = usePlayback();
  const activeStory = playback.current || item;
  const isPlaying = playback.playing;

  const handlePlayToggle = () => {
    if (playback.current?.id === activeStory.id) {
      playback.toggle();
    } else {
      playback.play(activeStory);
    }
  };

  return (
    <View className={cn("overflow-hidden rounded-[22px]", className)}>
      <LinearGradient
        colors={["#351B52", "#21102F"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          minHeight: 150,
          padding: 20,
          justifyContent: "space-between",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Continue listening: ${activeStory.title}`}
          accessibilityHint="Opens the full player."
          onPress={() => {
            if (playback.current?.id !== activeStory.id) {
              playback.play(activeStory);
            }
            router.push(routes.player);
          }}
          className="gap-2 sm:gap-3 active:opacity-90"
        >
          <View className="flex-row items-center gap-2.5">
            <AppText
              variant="overline"
              className={cn(
                "tracking-[0.4px]",
                isPlaying ? "text-[#C49BFF]" : "text-voice-muted",
              )}
            >
              {isPlaying ? "NOW PLAYING" : "CONTINUE LISTENING"}
            </AppText>
            {isPlaying ? <SoundWaveBars playing={isPlaying} size="sm" /> : null}
          </View>

          <AppText
            className="font-display text-[20px] sm:text-2xl leading-[25px] sm:leading-[29px] text-white"
            numberOfLines={2}
          >
            {activeStory.title}
          </AppText>
        </Pressable>

        <View className="mt-2 flex-row items-end justify-between">
          <AppText
            className="text-[11px] sm:text-xs leading-[15px] text-voice-muted"
            numberOfLines={1}
          >
            {activeStory.creator} ·{" "}
            {isPlaying ? "Playing now" : activeStory.duration}
          </AppText>

          <Pressable
            accessibilityRole={isWeb ? "none" : "button"}
            accessibilityLabel={isPlaying ? "Pause playback" : "Resume playback"}
            accessibilityHint={
              isPlaying
                ? "Pauses current audio"
                : "Resumes playing this story"
            }
            hitSlop={6}
            tabIndex={isWeb ? -1 : undefined}
            onPress={handlePlayToggle}
            className="h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-surface shadow-md active:opacity-75"
          >
            <SymbolView
              name={isPlaying ? icons.pause : icons.play}
              size={17}
              tintColor={colors.voicePanel}
            />
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}
