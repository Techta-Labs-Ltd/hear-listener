import { useRouter } from "expo-router";
import { ContinueListeningCard } from "@/components/content/ContinueListeningCard";
import { StoryTile } from "@/components/content/StoryTile";
import { IconButton } from "@/components/ui/IconButton";
import { AppText } from "@/components/ui/AppText";
import { formatDateLabel, greetingForTime } from "@/utils/text";
import { routes } from "@/navigation/routes";
import { homeCopy } from "@/utils/copy/home";
import { icons } from "@/utils/icons/app-icons";
import { colors } from "@/constants/theme";
import { VoiceReadyBanner } from "@/components/home/VoiceReadyBanner";
import { Pressable, View } from "@/tw";
import { useContent, usePlayback } from "@/stores";

export function ReturningHome() {
  const router = useRouter();
  const { stories } = useContent();
  const playback = usePlayback();
  const continueListening = playback.current;

  return (
    <>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
            {formatDateLabel()}
          </AppText>
          <AppText
            accessibilityRole="header"
            className="mt-1.5 sm:mt-2 font-display text-[24px] sm:text-[31px] leading-[30px] sm:leading-[37px] text-ink"
            numberOfLines={2}
          >
            {greetingForTime(homeCopy.personName)}
          </AppText>
        </View>
        <IconButton
          symbol={icons.settings}
          label={homeCopy.settingsLabel}
          onPress={() => router.push(routes.settings)}
          tintColor={colors.voiceCanvas}
          className="h-10 w-10 shrink-0 ml-2 bg-surface"
        />
      </View>
      <VoiceReadyBanner className="mt-4 sm:mt-5" />
      {continueListening ? (
        <ContinueListeningCard item={continueListening} className="mt-4 sm:mt-5" />
      ) : null}
      <View className="mt-5 sm:mt-[23px] flex-row items-center justify-between">
        <AppText
          accessibilityRole="header"
          className="font-display text-lg sm:text-[21px] leading-[22px] sm:leading-[25px] text-ink"
        >
          {homeCopy.nearYouTitle}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${homeCopy.seeAllLabel} stories near you`}
          accessibilityHint="Opens Discover."
          onPress={() => router.push(routes.discover)}
          className="min-h-11 justify-center active:opacity-70"
        >
          <AppText className="font-body-bold text-xs sm:text-[13px] leading-4 text-primary">
            {homeCopy.seeAllLabel}
          </AppText>
        </Pressable>
      </View>
      {stories.length > 0 ? (
        <View className="mt-3.5 sm:mt-[19px] flex-row gap-2.5 sm:gap-[14px]">
          {stories.slice(0, 2).map((story) => (
            <StoryTile key={story.id} item={story} />
          ))}
        </View>
      ) : null}
    </>
  );
}
