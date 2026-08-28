import { useRouter } from "expo-router";
import { StoryRow } from "@/components/content/StoryRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionPageHeader } from "@/components/library/SectionPageHeader";
import { AppText } from "@/components/ui/AppText";
import { Pressable, View } from "@/tw";
import { useContent } from "@/stores";
import { libraryCopy, librarySectionCopy } from "@/utils/copy/library";
import { icons } from "@/utils/icons/app-icons";
import { safeBack } from "@/utils/navigation";

export function HistorySection() {
  const router = useRouter();
  const copy = librarySectionCopy.history;
  const { history, stories, clearHistory } = useContent();

  const groups = history.filter((group) =>
    group.rows.some(
      (row) => row.item || stories.some((story) => story.id === row.storyId),
    ),
  );

  return (
    <>
      <SectionPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        backLabel={libraryCopy.back}
        onBack={() => safeBack(router, "/library")}
      />
      {groups.length ? (
        <View className="mt-[20px] gap-[13px]">
          {groups.map((group) => (
            <View key={group.label} className="gap-[13px]">
              <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
                {group.label}
              </AppText>
              {group.rows.map((row) => {
                const item =
                  row.item ?? stories.find((story) => story.id === row.storyId);
                return item ? (
                  <StoryRow key={row.storyId} item={item} thumbSize="none" subtitle={row.meta} />
                ) : null;
              })}
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear history"
            accessibilityHint="Removes your listening history."
            onPress={clearHistory}
            className="min-h-12 self-start justify-center active:opacity-70"
          >
            <AppText className="font-body-bold text-xs leading-[15px] text-[#a64e55]">
              {copy.clear}
            </AppText>
          </Pressable>
        </View>
      ) : (
        <EmptyState
          icon={icons.historyEmpty}
          title={copy.emptyTitle}
          description={copy.emptyDescription}
        />
      )}
    </>
  );
}
