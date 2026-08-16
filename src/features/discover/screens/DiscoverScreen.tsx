import { useRouter } from "expo-router";
import { ScrollView, View } from "@/tw";
import { MiniPlayer } from "@/components/player/MiniPlayer";
import { StoryCard } from "@/components/content/StoryCard";
import { AppScreen } from "@/components/ui/AppScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AppText } from "@/components/ui/AppText";
import { stories, topics } from "@/data/catalogue";
import { TopicGrid } from "@/components/content/TopicGrid";
import { discoverCopy } from "@/utils/copy/discover";
import { icons } from "@/utils/icons/app-icons";
import { topicRoute } from "@/navigation/routes";
import { VoicePrompt } from "@/components/voice/VoicePrompt";

export function DiscoverScreen() {
  const router = useRouter();
  const featured = stories.filter((item) => item.id === "local-voices");

  return (
    <AppScreen>
      <ScrollView contentContainerClassName="gap-6 p-4 pb-[110px]">
        <View>
          <AppText variant="overline" tone="primary">
            {discoverCopy.eyebrow}
          </AppText>
          <AppText variant="title">{discoverCopy.title}</AppText>
        </View>
        <VoicePrompt example="Find technology podcasts" />
        <View>
          <SectionHeader
            eyebrow={discoverCopy.topicsEyebrow}
            title={discoverCopy.topicsTitle}
          />
          <TopicGrid
            topics={topics}
            onSelect={(topicId) => router.push(topicRoute(topicId))}
          />
        </View>
        <View>
          <SectionHeader
            eyebrow={discoverCopy.featuredEyebrow}
            title={discoverCopy.featuredTitle}
          />
          {featured.length > 0 ? (
            featured.map((item) => (
              <View className="mb-2" key={item.id}>
                <StoryCard item={item} />
              </View>
            ))
          ) : (
            <EmptyState
              icon={icons.waveform}
              title={discoverCopy.emptyTitle}
              description={discoverCopy.emptyDescription}
            />
          )}
        </View>
      </ScrollView>
      <MiniPlayer />
    </AppScreen>
  );
}
