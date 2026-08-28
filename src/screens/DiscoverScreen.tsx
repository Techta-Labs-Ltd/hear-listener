import { useEffect } from "react";
import { RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { OfflineNotice } from "@/components/content/OfflineNotice";
import { OnlineDiscoverContent } from "@/components/content/OnlineDiscoverContent";
import { DiscoverSkeleton } from "@/components/content/DiscoverSkeleton";
import { StoryRow } from "@/components/content/StoryRow";
import { AppScreen } from "@/components/ui/AppScreen";
import { AppText } from "@/components/ui/AppText";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { useContent } from "@/stores";
import { useNetworkState } from "@/hooks/useNetworkState";
import { librarySectionRoute } from "@/navigation/routes";
import { ScrollView, View } from "@/tw";
import { discoverCopy } from "@/utils/copy/discover";

export function DiscoverScreen() {
  const router = useRouter();
  const { isOnline } = useNetworkState();
  const { stories, loading, refreshing, refresh, fetchCatalogue } = useContent();

  useEffect(() => {
    void fetchCatalogue();
  }, [fetchCatalogue]);

  const editorPick = stories[2];
  const tonight = stories[3];
  const offlineStories = stories.filter((item) => item.downloaded);

  return (
    <AppScreen
      screenTitle="Discover"
      screenOrientation="Discover. Say a topic, play trending, or read this screen."
      voiceCommands={["open technology", "play trending", "read this screen"]}
    >
      <ScrollView
        contentContainerClassName="px-4 sm:px-5 pt-4 sm:pt-8 pb-[140px]"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
          />
        }
      >
        {loading ? (
          <DiscoverSkeleton />
        ) : (
          <>
            <AppText
              variant="overline"
              tone="primary"
              className="tracking-[0.4px]"
            >
              {discoverCopy.eyebrow}
            </AppText>
            <AppText
              accessibilityRole="header"
              className="mt-[5px] font-display text-[31px] leading-[37px] text-ink"
            >
              {discoverCopy.title}
            </AppText>
            {isOnline ? (
              <OnlineDiscoverContent
                editorPick={editorPick}
                tonight={tonight}
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
          </>
        )}
      </ScrollView>
    </AppScreen>
  );
}
