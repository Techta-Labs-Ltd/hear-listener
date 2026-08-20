import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { AppText } from "@/components/ui/AppText";
import { stories } from "@/data/catalogue";
import { usePlayback } from "@/stores";
import { routes } from "@/navigation/routes";
import { homeCopy } from "@/utils/copy/home";
import { VoiceReadyBanner } from "@/components/home/VoiceReadyBanner";
import { QuickStartCard } from "@/components/home/QuickStartCard";
import { Pressable, View } from "@/tw";

export function FirstUseHome({ onDismiss }: { onDismiss: () => void }) {
  const router = useRouter();
  const playback = usePlayback();

  return (
    <>
      <AppText
        accessibilityRole="header"
        className="font-display text-2xl sm:text-[30px] leading-8 sm:leading-9 text-ink"
      >
        {homeCopy.firstUseTitle}
      </AppText>
      <VoiceReadyBanner className="mt-5 sm:mt-8" />
      <AppText
        accessibilityRole="header"
        className="mt-5 sm:mt-7 font-display text-lg sm:text-[21px] leading-[22px] sm:leading-[25px] text-ink"
      >
        {homeCopy.quickStartTitle}
      </AppText>
      <View className="mt-4 sm:mt-5 gap-2.5 sm:gap-3">
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
        className="mt-5 sm:mt-[25px] h-[50px] sm:h-[54px] rounded-full bg-voice-canvas"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={homeCopy.dismissGuideLabel}
        accessibilityHint="Shows the regular home screen from now on."
        onPress={onDismiss}
        className="mt-3 sm:mt-[17px] min-h-11 items-center justify-center self-center active:opacity-70"
      >
        <AppText className="font-body-bold text-[13px] leading-4 text-primary">
          {homeCopy.dismissGuideLabel}
        </AppText>
      </Pressable>
    </>
  );
}
