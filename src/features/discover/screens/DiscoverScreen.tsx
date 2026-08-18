import { OfflineNotice } from "@/components/content/OfflineNotice";
import { PromoCard } from "@/components/content/PromoCard";
import { StoryRow } from "@/components/content/StoryRow";
import { TopicChip } from "@/components/content/TopicChip";
import { AppScreen } from "@/components/ui/AppScreen";
import { AppText } from "@/components/ui/AppText";
import { SearchBar } from "@/components/ui/SearchBar";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { stories, topics } from "@/data/catalogue";
import { useNetworkState } from "@/hooks/useNetworkState";
import { librarySectionRoute, routes, topicRoute } from "@/navigation/routes";
import { usePlayback } from "@/stores";
import { ScrollView, View } from "@/tw";
import type { ContentItem } from "@/types";
import { discoverCopy } from "@/utils/copy/discover";
import { useRouter } from "expo-router";

const TOPIC_ACCENTS = ["#0F6973", "#A64E55", "#6E38C9"] as const;

export function DiscoverScreen() {
  const router = useRouter();
  const playback = usePlayback();
  const { isOnline } = useNetworkState();

  const editorPick = stories[2];
  const tonight = stories[3];
  const offlineStories = stories.filter((item) => item.downloaded);

  return (
    <AppScreen>
      <ScrollView
        contentContainerClassName="px-5 pt-8 pb-[110px]"
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
          {discoverCopy.eyebrow}
        </AppText>
        <AppText
          accessibilityRole="header"
          className="mt-[5px] font-display text-[31px] leading-[37px] text-ink"
        >
          {discoverCopy.title}
        </AppText>
        <SearchBar
          label={discoverCopy.searchLabel}
          onPress={() => router.push(routes.search)}
          className="mt-5"
        />
        {isOnline ? (
          <OnlineDiscoverContent
            editorPick={editorPick}
            tonight={tonight}
            onEditorPlay={() => {
              playback.play(editorPick);
              router.push(routes.player);
            }}
            onTopic={(topicId) => router.push(topicRoute(topicId))}
          />
        ) : (
          <>
            <View
              accessible
              accessibilityLabel={discoverCopy.offlineSkeletonLabel}
              className="mt-[22px] rounded-[20px] border border-border bg-surface p-5"
            >
              <View className="flex-row items-center gap-3">
                <SkeletonBlock className="h-7 w-7 rounded-full" />
                <View className="flex-1 gap-[10px]">
                  <SkeletonBlock className="h-3 w-[190px]" />
                  <SkeletonBlock className="h-2.5 w-[130px]" tone="soft" />
                </View>
              </View>
              <SkeletonBlock className="mt-4 h-[38px] rounded-[10px]" tone="soft" />
            </View>
            <OfflineNotice
              onOpenDownloads={() => router.push(librarySectionRoute("downloads"))}
              className="mt-[18px]"
            />
            {offlineStories.length ? (
              <>
                <AppText
                  accessibilityRole="header"
                  className="mt-[29px] font-display text-[19px] leading-[23px] text-ink"
                >
                  {discoverCopy.recentlyTitle}
                </AppText>
                <View className="mt-3 gap-3">
                  {offlineStories.map((item) => (
                    <StoryRow key={item.id} item={item} thumbSize="none" />
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </AppScreen>
  );
}

function OnlineDiscoverContent({
  editorPick,
  tonight,
  onEditorPlay,
  onTopic,
}: {
  editorPick?: ContentItem;
  tonight?: ContentItem;
  onEditorPlay: () => void;
  onTopic: (topicId: string) => void;
}) {
  return (
    <>
      {editorPick ? (
        <PromoCard
          tone="editor"
          eyebrow={discoverCopy.editorEyebrow}
          title={editorPick.title}
          description={editorPick.description ?? editorPick.creator}
          playLabel={`Play ${editorPick.title}`}
          accessibilityHint="Plays the editor's pick and opens the player."
          onPress={onEditorPlay}
          className="mt-[22px]"
        />
      ) : null}
      <AppText
        accessibilityRole="header"
        className="mt-[23px] font-display text-xl leading-6 text-ink"
      >
        {discoverCopy.browseTitle}
      </AppText>
      <ScrollView
        horizontal
        contentContainerClassName="mt-[23px] gap-[13px]"
        showsHorizontalScrollIndicator={false}
      >
        {topics.map((topic, index) => (
          <TopicChip
            key={topic.id}
            topic={topic}
            count={stories.filter((item) => item.topicIds?.includes(topic.id)).length}
            accent={TOPIC_ACCENTS[index % TOPIC_ACCENTS.length]}
            onPress={() => onTopic(topic.id)}
          />
        ))}
      </ScrollView>
      <AppText
        accessibilityRole="header"
        className="mt-[27px] font-display text-xl leading-6 text-ink"
      >
        {discoverCopy.tonightTitle}
      </AppText>
      {tonight ? <StoryRow item={tonight} className="mt-[23px]" /> : null}
    </>
  );
}
