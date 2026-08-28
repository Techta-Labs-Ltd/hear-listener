import { useRouter } from "expo-router";
import { SymbolView } from "@/components/ui/AppIcon";
import { StoryRow } from "@/components/content/StoryRow";
import { SectionPageHeader } from "@/components/library/SectionPageHeader";
import { AppText } from "@/components/ui/AppText";
import { Pressable, View } from "@/tw";
import { colors } from "@/constants/theme";
import { useVoice } from "@/hooks/useVoice";
import { useContent, usePreferences } from "@/stores";
import { libraryCopy, librarySectionCopy } from "@/utils/copy/library";
import { icons } from "@/utils/icons/app-icons";
import { safeBack } from "@/utils/navigation";

export function SavedSection() {
  const router = useRouter();
  const voice = useVoice();
  const { preferences } = usePreferences();
  const { stories } = useContent();
  const copy = librarySectionCopy.saved;
  const saved = stories.filter((item) => preferences.savedIds.includes(item.id));

  if (!saved.length) {
    return (
      <>
        <SectionPageHeader
          small
          eyebrow={copy.eyebrow}
          title={copy.title}
          backLabel={libraryCopy.back}
          onBack={() => safeBack(router, "/library")}
        />
        <View className="mt-8 sm:mt-[94px] h-20 w-20 sm:h-24 sm:w-24 self-center items-center justify-center rounded-full bg-primary-soft">
          <SymbolView name={icons.savedEmpty} size={32} tintColor={colors.primary} />
        </View>
        <AppText
          accessibilityRole="header"
          className="mt-6 sm:mt-10 self-center font-display text-[24px] sm:text-[26px] leading-[28px] sm:leading-[31px] text-ink"
        >
          {copy.emptyTitle}
        </AppText>
        <AppText
          tone="muted"
          className="mt-3 sm:mt-[17px] self-center text-center text-xs sm:text-sm leading-[16px] sm:leading-[17px] max-w-[280px]"
        >
          {copy.emptyDescription}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.browse}
          accessibilityHint="Starts voice to find stories."
          onPress={() => void voice.startVoiceSession({ source: "contextualAction" })}
          className="mt-7 sm:mt-[38px] h-[52px] sm:h-[54px] w-[184px] sm:w-[196px] self-center items-center justify-center rounded-full bg-primary active:opacity-85"
        >
          <AppText className="font-body-bold text-sm leading-[18px] text-white">
            {copy.browse}
          </AppText>
        </Pressable>
      </>
    );
  }

  return (
    <>
      <SectionPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        subtitle={`${saved.length} ${saved.length === 1 ? "story" : "stories"} saved`}
        backLabel={libraryCopy.back}
        onBack={() => safeBack(router, "/library")}
      />
      <View className="mt-5 sm:mt-[25px] gap-3 sm:gap-[13px]">
        {saved.map((item) => (
          <StoryRow key={item.id} item={item} thumbSize="md" showPlay />
        ))}
      </View>
    </>
  );
}
