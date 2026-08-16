import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, View } from "@/tw";
import { StoryCard } from "@/components/content/StoryCard";
import { AppScreen } from "@/components/ui/AppScreen";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListRow, ListSection } from "@/components/ui/List";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { AppText } from "@/components/ui/AppText";
import { librarySectionCopy, libraryCopy } from "@/utils/copy/library";
import { icons } from "@/utils/icons/app-icons";
import { entities, stories } from "@/data/catalogue";
import { usePreferences } from "@/stores";
import { parseLibrarySection } from "@/navigation/routes";
import { initials } from "@/utils/text";

export function LibrarySectionScreen() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { preferences, updatePreferences } = usePreferences();
  const activeSection = parseLibrarySection(section);
  const copy = librarySectionCopy[activeSection];
  const emptyIcons = {
    saved: icons.savedEmpty,
    following: icons.followingEmpty,
    downloads: icons.downloadEmpty,
    history: icons.historyEmpty,
  } as const;

  const storiesForSection = stories.filter((story) => {
    if (activeSection === "saved")
      return preferences.savedIds.includes(story.id);
    if (activeSection === "downloads") {
      return story.downloaded || preferences.downloadedIds.includes(story.id);
    }
    if (activeSection === "history") return story.progress !== undefined;
    return false;
  });
  const followedEntities = entities.filter((entity) =>
    preferences.followingIds.includes(entity.id),
  );
  const isEmpty =
    activeSection === "following"
      ? followedEntities.length === 0
      : storiesForSection.length === 0;

  return (
    <AppScreen>
      <ScreenHeader
        title={copy.title}
        eyebrow={copy.eyebrow}
        backLabel={libraryCopy.back}
        onBack={router.back}
      />
      <ScrollView contentContainerClassName="w-full max-w-[720px] self-center gap-4 p-4 pb-12">
        {isEmpty ? (
          <EmptyState
            icon={emptyIcons[activeSection]}
            title={copy.emptyTitle}
            description={copy.emptyDescription}
          />
        ) : activeSection === "following" ? (
          <ListSection>
            {followedEntities.map((entity) => (
              <ListRow
                key={entity.id}
                title={entity.name}
                detail={entity.description}
                leading={
                  <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary-soft">
                    <AppText variant="overline" tone="primary">
                      {initials(entity.name)}
                    </AppText>
                  </View>
                }
                trailing={
                  <Button
                    label={libraryCopy.unfollow}
                    variant="ghost"
                    onPress={() =>
                      updatePreferences({
                        followingIds: preferences.followingIds.filter(
                          (id) => id !== entity.id,
                        ),
                      })
                    }
                  />
                }
              />
            ))}
          </ListSection>
        ) : (
          <View className="overflow-hidden rounded-card border border-border bg-surface">
            {storiesForSection.map((story) => (
              <StoryCard key={story.id} item={story} compact />
            ))}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}
