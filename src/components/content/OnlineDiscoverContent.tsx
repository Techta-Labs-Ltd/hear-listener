import { useRouter } from "expo-router";
import { PromoCard } from "@/components/content/PromoCard";
import { StoryRow } from "@/components/content/StoryRow";
import { TopicChip } from "@/components/content/TopicChip";
import { AppText } from "@/components/ui/AppText";
import { stories, topics } from "@/data/catalogue";
import { routes, topicRoute } from "@/navigation/routes";
import { usePlayback } from "@/stores";
import { ScrollView } from "@/tw";
import type { ContentItem } from "@/types";
import { discoverCopy } from "@/utils/copy/discover";

const TOPIC_ACCENTS = ["#0F6973", "#A64E55", "#6E38C9"] as const;

export function OnlineDiscoverContent({
  editorPick,
  tonight,
}: {
  editorPick?: ContentItem;
  tonight?: ContentItem;
}) {
  const router = useRouter();
  const playback = usePlayback();

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
          onPress={() => {
            playback.play(editorPick);
            router.push(routes.player);
          }}
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
            onPress={() => router.push(topicRoute(topic.id))}
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
