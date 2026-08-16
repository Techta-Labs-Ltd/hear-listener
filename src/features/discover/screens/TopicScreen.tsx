import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, View } from "@/tw";
import { StoryCard } from "@/components/content/StoryCard";
import { AppScreen } from "@/components/ui/AppScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { AppText } from "@/components/ui/AppText";
import { topicCopy } from "@/utils/copy/topic";
import { icons } from "@/utils/icons/app-icons";
import { stories, topics } from "@/data/catalogue";

export function TopicScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const topic = topics.find((item) => item.id === id) ?? topics[0];
  const items = stories.filter((item) => item.topicIds?.includes(topic.id));

  return (
    <AppScreen>
      <ScreenHeader
        eyebrow={topicCopy.eyebrow}
        title={topic.name}
        backLabel={topicCopy.back}
        onBack={router.back}
      />
      <ScrollView contentContainerClassName="w-full max-w-[720px] self-center gap-4 p-4 pb-12">
        <AppText tone="muted">{topic.description}</AppText>
        {items.length ? (
          <View className="gap-3">
            {items.map((item) => (
              <StoryCard key={item.id} item={item} compact />
            ))}
          </View>
        ) : (
          <EmptyState
            icon={icons.waveform}
            title={topicCopy.emptyTitle}
            description={topicCopy.emptyDescription}
          />
        )}
      </ScrollView>
    </AppScreen>
  );
}
