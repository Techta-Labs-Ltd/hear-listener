import { useRouter } from "expo-router";
import { ScrollView, View } from "@/tw";
import { MiniPlayer } from "@/components/player/MiniPlayer";
import { StoryCard } from "@/components/content/StoryCard";
import { AppScreen } from "@/components/ui/AppScreen";
import { IconButton } from "@/components/ui/IconButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AppText } from "@/components/ui/AppText";
import { stories } from "@/data/catalogue";
import { formatDateLabel, greetingForTime } from "@/utils/text";
import { routes } from "@/navigation/routes";
import { homeCopy } from "@/utils/copy/home";
import { icons } from "@/utils/icons/app-icons";
import { VoicePrompt } from "@/components/voice/VoicePrompt";

export function HomeScreen() {
  const router = useRouter();

  return (
    <AppScreen>
      <ScrollView contentContainerClassName="gap-6 p-4 pb-[110px]">
        <View className="flex-row items-start justify-between">
          <View>
            <AppText variant="overline" tone="primary">
              {formatDateLabel()}
            </AppText>
            <AppText variant="title">
              {greetingForTime(homeCopy.personName)}
            </AppText>
          </View>
          <IconButton
            symbol={icons.settings}
            label={homeCopy.settingsLabel}
            onPress={() => router.push(routes.settings)}
          />
        </View>
        <VoicePrompt example="Play my local news" />
        <View>
          <SectionHeader
            eyebrow={homeCopy.continueEyebrow}
            title={homeCopy.continueTitle}
          />
          <StoryCard item={stories[0]} />
        </View>
        <View>
          <SectionHeader
            eyebrow={homeCopy.localEyebrow}
            title={homeCopy.localTitle}
            onAction={() => router.push(routes.discover)}
          />
          <View className="overflow-hidden rounded-card border border-border bg-surface">
            <StoryCard item={stories[1]} compact />
            <StoryCard item={stories[2]} compact />
          </View>
        </View>
      </ScrollView>
      <MiniPlayer />
    </AppScreen>
  );
}
