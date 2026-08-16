import { useRouter } from "expo-router";
import { ScrollView, View } from "@/tw";
import { MiniPlayer } from "@/components/player/MiniPlayer";
import { StoryCard } from "@/components/content/StoryCard";
import { AppScreen } from "@/components/ui/AppScreen";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { LibraryMenuCard } from "@/components/library/LibraryMenuCard";
import { stories } from "@/data/catalogue";
import { usePreferences } from "@/stores";
import { librarySectionRoute } from "@/navigation/routes";
import { libraryCopy } from "@/utils/copy/library";
import { icons } from "@/utils/icons/app-icons";
import { VoicePrompt } from "@/components/voice/VoicePrompt";

export function LibraryScreen() {
  const router = useRouter();
  const { preferences } = usePreferences();
  const downloads = stories.filter(
    (item) => item.downloaded || preferences.downloadedIds.includes(item.id),
  );
  const rows = [
    {
      title: "Saved audio",
      detail: "12 stories",
      section: "saved",
    },
    {
      title: "People you follow",
      detail: "8 creators and publications",
      section: "following",
    },
    {
      title: "Downloaded audio",
      detail: "3 ready offline",
      section: "downloads",
    },
    {
      title: "Listening history",
      detail: "Recently played",
      section: "history",
    },
  ] as const;

  return (
    <AppScreen>
      <ScrollView contentContainerClassName="gap-6 p-4 pb-[120px]">
        <View className="flex-row items-start justify-between">
          <View>
            <AppText variant="overline" tone="primary">
              {libraryCopy.eyebrow}
            </AppText>
            <AppText variant="title">{libraryCopy.title}</AppText>
          </View>
          <IconButton
            symbol={icons.settings}
            label="Open settings"
            onPress={() => router.push("/settings")}
          />
        </View>
        <VoicePrompt example="Open my downloads" />
        <View className="gap-2">
          {rows.map((row) => (
            <LibraryMenuCard
              key={row.title}
              title={row.title}
              detail={row.detail}
              onPress={() => router.push(librarySectionRoute(row.section))}
            />
          ))}
        </View>
        <View className="gap-3">
          <AppText variant="overline" tone="primary">
            {libraryCopy.offlineEyebrow}
          </AppText>
          <AppText variant="heading">{libraryCopy.offlineTitle}</AppText>
          {downloads.length > 0 ? (
            downloads.map((item) => (
              <StoryCard key={item.id} item={item} compact />
            ))
          ) : (
            <EmptyState
              icon={icons.downloadEmpty}
              title={libraryCopy.emptyDownloadsTitle}
              description={libraryCopy.emptyDownloadsDescription}
            />
          )}
        </View>
      </ScrollView>
      <MiniPlayer />
    </AppScreen>
  );
}
