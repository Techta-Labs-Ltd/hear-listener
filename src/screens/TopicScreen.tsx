import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "@/components/ui/AppIcon";
import { PromoCard } from "@/components/content/PromoCard";
import { StoryRow } from "@/components/content/StoryRow";
import { TopicSkeleton } from "@/components/content/TopicSkeleton";
import { AppScreen } from "@/components/ui/AppScreen";
import { AppText } from "@/components/ui/AppText";
import { Pressable, ScrollView, View } from "@/tw";
import { colors } from "@/constants/theme";
import { useContent, usePlayback } from "@/stores";
import { icons } from "@/utils/icons/app-icons";
import { routes } from "@/navigation/routes";
import { safeBack } from "@/utils/navigation";
import { topicCopy } from "@/utils/copy/topic";

export function TopicScreen() {
  const router = useRouter();
  const playback = usePlayback();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { stories, topics, loading, fetchCatalogue } = useContent();

  useEffect(() => {
    void fetchCatalogue();
  }, [fetchCatalogue]);

  const topic = topics.find((item) => item.id === id) ?? topics[0];
  const items = topic
    ? stories.filter((item) => item.topicIds?.includes(topic.id))
    : [];
  const briefing = items[0] ?? stories[0];

  return (
    <AppScreen
      screenTitle={topic?.name ? `Topic: ${topic.name}` : "Topic"}
      screenOrientation={`Topic: ${topic?.name || "browse"}. Say play a story, go back, or read this screen.`}
      voiceCommands={["play this story", "go back", "read this screen"]}
    >
      <ScrollView
        contentContainerClassName="px-4 sm:px-5 pt-4 sm:pt-8 pb-[140px]"
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <TopicSkeleton />
        ) : (
          <>
            <View className="flex-row items-center">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={topicCopy.back}
                accessibilityHint="Returns to the Discover tab."
                onPress={() => safeBack(router, routes.discover)}
                hitSlop={6}
                className="-ml-2 h-12 w-12 justify-center active:opacity-70"
              >
                <SymbolView name={icons.back} size={24} tintColor={colors.text} />
              </Pressable>
              <AppText
                variant="overline"
                tone="primary"
                className="flex-1 pr-10 text-center tracking-[0.4px]"
              >
                {topicCopy.eyebrow}
              </AppText>
            </View>
            <AppText
              accessibilityRole="header"
              className="mt-[13px] font-display text-[30px] leading-9 text-ink"
            >
              {topic?.name ?? "Hear! audio"}
            </AppText>
            <AppText tone="muted" className="mt-[9px] text-[13px] leading-4">
              {topic?.description ?? "Latest audio from the Hear! catalogue."}
            </AppText>
            {briefing ? (
              <PromoCard
                compact
                eyebrow="DAILY BRIEFING"
                title={briefing.title}
                meta={`${briefing.duration.replace(" left", "")} · Updated 8:00 PM`}
                accessibilityHint="Plays today's daily briefing."
                onPress={() => {
                  playback.play(briefing);
                  router.push(routes.player);
                }}
                className="mt-[25px]"
              />
            ) : null}
            <View className="mt-[20px] gap-[13px]">
              {items.map((item) => (
                <StoryRow key={item.id} item={item} showPlay />
              ))}
            </View>
            {items.length === 0 ? (
              <View className="mt-10 gap-2 rounded-[20px] border border-border bg-surface p-6">
                <AppText className="font-body-bold text-ink">
                  {topicCopy.emptyTitle}
                </AppText>
                <AppText tone="muted" className="text-sm leading-5">
                  {topicCopy.emptyDescription}
                </AppText>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </AppScreen>
  );
}
