import { useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "@/tw";
import { ContinueListeningCard } from "@/components/content/ContinueListeningCard";
import { StoryTile } from "@/components/content/StoryTile";
import { AppScreen } from "@/components/ui/AppScreen";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { AppText } from "@/components/ui/AppText";
import { stories } from "@/data/catalogue";
import { usePlayback, usePreferencesStore } from "@/stores";
import { formatDateLabel, greetingForTime } from "@/utils/text";
import { routes } from "@/navigation/routes";
import { homeCopy } from "@/utils/copy/home";
import { icons } from "@/utils/icons/app-icons";
import { colors } from "@/constants/theme";
import { VoiceReadyBanner } from "../components/VoiceReadyBanner";
import { QuickStartCard } from "../components/QuickStartCard";

export function HomeScreen() {
  const guideDismissed = usePreferencesStore((state) => state.homeGuideDismissed);
  const updatePreferences = usePreferencesStore((state) => state.updatePreferences);

  return (
    <AppScreen>
      <ScrollView
        contentContainerClassName="px-5 pt-8 pb-[110px]"
        showsVerticalScrollIndicator={false}
      >
        {guideDismissed ? (
          <ReturningHome />
        ) : (
          <FirstUseHome onDismiss={() => updatePreferences({ homeGuideDismissed: true })} />
        )}
      </ScrollView>
    </AppScreen>
  );
}

function ReturningHome() {
  const router = useRouter();

  return (
    <>
      <View className="flex-row items-start justify-between">
        <View>
          <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
            {formatDateLabel()}
          </AppText>
          <AppText
            accessibilityRole="header"
            className="mt-2 font-display text-[31px] leading-[37px] text-ink"
          >
            {greetingForTime(homeCopy.personName)}
          </AppText>
        </View>
        <IconButton
          symbol={icons.settings}
          label={homeCopy.settingsLabel}
          onPress={() => router.push(routes.settings)}
          tintColor={colors.voiceCanvas}
          className="h-10 w-10 bg-surface"
        />
      </View>
      <ContinueListeningCard item={stories[0]} className="mt-[26px]" />
      <View className="mt-[23px] flex-row items-center justify-between">
        <AppText
          accessibilityRole="header"
          className="font-display text-[21px] leading-[25px] text-ink"
        >
          {homeCopy.nearYouTitle}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${homeCopy.seeAllLabel} stories near you`}
          accessibilityHint="Opens Discover."
          onPress={() => router.push(routes.discover)}
          className="min-h-12 justify-center active:opacity-70"
        >
          <AppText className="font-body-bold text-[13px] leading-4 text-primary">
            {homeCopy.seeAllLabel}
          </AppText>
        </Pressable>
      </View>
      <View className="mt-[19px] flex-row gap-[14px]">
        <StoryTile item={stories[1]} />
        <StoryTile item={stories[2]} />
      </View>
    </>
  );
}

function FirstUseHome({ onDismiss }: { onDismiss: () => void }) {
  const router = useRouter();
  const playback = usePlayback();

  return (
    <>
      <AppText
        accessibilityRole="header"
        className="font-display text-[30px] leading-9 text-ink"
      >
        {homeCopy.firstUseTitle}
      </AppText>
      <VoiceReadyBanner className="mt-8" />
      <AppText
        accessibilityRole="header"
        className="mt-7 font-display text-[21px] leading-[25px] text-ink"
      >
        {homeCopy.quickStartTitle}
      </AppText>
      <View className="mt-5 gap-3">
        <QuickStartCard
          step={1}
          title={homeCopy.quickStartSteps[0].title}
          description={homeCopy.quickStartSteps[0].description}
        />
        <QuickStartCard
          step={2}
          title={homeCopy.quickStartSteps[1].title}
          description={homeCopy.quickStartSteps[1].description}
          tone="peach"
        />
      </View>
      <Button
        label={homeCopy.quickStartAction}
        onPress={() => {
          playback.play(stories[1]);
          router.push(routes.player);
        }}
        className="mt-[25px] h-[54px] rounded-full bg-voice-canvas"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={homeCopy.dismissGuideLabel}
        accessibilityHint="Shows the regular home screen from now on."
        onPress={onDismiss}
        className="mt-[17px] min-h-12 items-center justify-center self-center active:opacity-70"
      >
        <AppText className="font-body-bold text-[13px] leading-4 text-primary">
          {homeCopy.dismissGuideLabel}
        </AppText>
      </Pressable>
    </>
  );
}
