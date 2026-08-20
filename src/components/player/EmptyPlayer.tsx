import { useRouter } from "expo-router";
import { SymbolView } from "@/components/ui/AppIcon";
import { AppScreen } from "@/components/ui/AppScreen";
import { IconButton } from "@/components/ui/IconButton";
import { AppText } from "@/components/ui/AppText";
import { Pressable, View } from "@/tw";
import { colors } from "@/constants/theme";
import { useVoice } from "@/hooks/useVoice";
import { routes } from "@/navigation/routes";
import { playerCopy as copy } from "@/utils/copy/player";
import { icons } from "@/utils/icons/app-icons";

export function EmptyPlayer() {
  const router = useRouter();
  const voice = useVoice();

  return (
    <AppScreen
      screenTitle="Player"
      screenOrientation="Player. No story is playing. Say browse or open Discover, or read this screen."
      voiceCommands={["open Discover", "play local news", "read this screen"]}
    >
      <View className="min-h-14 flex-row items-center justify-between px-3">
        <IconButton symbol={icons.collapse} label={copy.close} onPress={router.back} />
        <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
          {copy.playerEyebrow}
        </AppText>
        <View className="h-10 w-10" />
      </View>
      <View className="flex-1 items-center justify-between px-6 pb-8 pt-2">
        <View className="flex-1 items-center justify-center">
          <View className="h-[100px] w-[100px] sm:h-[130px] sm:w-[130px] md:h-[148px] md:w-[148px] items-center justify-center rounded-full bg-primary-soft">
            <SymbolView name={icons.playEmpty} size={48} tintColor={colors.primary} />
          </View>
          <AppText
            accessibilityRole="header"
            className="mt-6 text-center font-display text-[24px] sm:text-[27px] leading-[30px] text-ink"
          >
            {copy.emptyTitle}
          </AppText>
          <AppText
            tone="muted"
            className="mt-3 text-center text-sm leading-[18px] max-w-[280px]"
          >
            {copy.emptyDescription}
          </AppText>
        </View>
        <View className="w-full max-w-[320px] items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.browse}
            accessibilityHint="Opens Discover."
            onPress={() => router.push(routes.discover)}
            className="h-[52px] w-full items-center justify-center rounded-full bg-voice-canvas active:opacity-70"
          >
            <AppText className="font-body-bold text-[15px] leading-[18px] text-white">
              {copy.browse}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.speak}
            accessibilityHint="Starts a voice command."
            onPress={() =>
              void voice.startVoiceSession({ source: "contextualAction" })
            }
            className="h-[52px] w-full items-center justify-center rounded-full border border-border bg-surface active:opacity-70"
          >
            <AppText className="font-body-bold text-[15px] leading-[18px] text-voice-canvas">
              {copy.speak}
            </AppText>
          </Pressable>
        </View>
      </View>
    </AppScreen>
  );
}
