import { useEffect } from "react";
import { RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { ScrollView, View } from "@/tw";
import { IconButton } from "@/components/ui/IconButton";
import { AppText } from "@/components/ui/AppText";
import { AppScreen } from "@/components/ui/AppScreen";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { LibrarySkeleton } from "@/components/library/LibrarySkeleton";
import { LibraryHubRow } from "@/components/library/LibraryHubRow";
import { LibraryHubTile } from "@/components/library/LibraryHubTile";
import { SyncPausedCard } from "@/components/library/SyncPausedCard";
import { useContent, usePreferences } from "@/stores";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { colors } from "@/constants/theme";
import { librarySectionTitle } from "@/constants/library";
import { icons } from "@/utils/icons/app-icons";
import { librarySectionRoute, routes } from "@/navigation/routes";
import { libraryCopy } from "@/utils/copy/library";

export function LibraryScreen() {
  const router = useRouter();
  const account = useAccountAccess();
  const { preferences } = usePreferences();
  const {
    stories,
    loading,
    refreshing,
    initialLoadComplete,
    refresh,
    fetchCatalogue,
  } = useContent();

  useEffect(() => {
    void fetchCatalogue();
  }, [fetchCatalogue]);

  const savedCount = preferences.savedIds.length;
  const followingCount = preferences.followingIds.length;
  const downloadsCount = stories.filter(
    (item) => item.downloaded || preferences.downloadedIds.includes(item.id),
  ).length;
  const syncError = account.status === "error";
  const syncing = account.status === "signingIn";
  const initialLoading =
    stories.length === 0 && (!initialLoadComplete || loading || refreshing);

  return (
    <AppScreen
      screenTitle="Library"
      screenOrientation="Library. Say open downloads, open saved audio, or read this screen."
      voiceCommands={["open downloads", "open saved audio", "read this screen"]}
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
        {initialLoading ? (
          <LibrarySkeleton />
        ) : (
          <>
            <View className="flex-row items-start justify-between">
              <View>
                <AppText
                  variant="overline"
                  tone="primary"
                  className="tracking-[0.4px]"
                >
                  {libraryCopy.eyebrow}
                </AppText>
                <AppText
                  accessibilityRole="header"
                  className="mt-[5px] font-display text-[31px] leading-[37px] text-ink"
                >
                  {libraryCopy.title}
                </AppText>
              </View>
              <IconButton
                symbol={icons.settings}
                label={libraryCopy.settingsLabel}
                onPress={() => router.push(routes.settings)}
                tintColor={colors.voiceCanvas}
                className="h-10 w-10 bg-surface"
              />
            </View>
            {syncError || account.error ? (
              <SyncPausedCard
                title={libraryCopy.syncTitle}
                description={account.error ?? libraryCopy.syncDescription}
                actionLabel={libraryCopy.syncRetry}
                onRetry={() => void account.signIn()}
                retrying={syncing}
                className="mt-[40px]"
              />
            ) : (
              <>
                <AppText
                  accessibilityRole="header"
                  className="mt-[39px] font-display text-[19px] leading-[23px] text-ink"
                >
                  {libraryCopy.savedSection}
                </AppText>
                {syncing ? (
                  <View className="mt-4 gap-3">
                    <SkeletonBlock
                      className="h-[86px] rounded-[20px]"
                      tone="soft"
                    />
                    <SkeletonBlock
                      className="h-[86px] rounded-[20px]"
                      tone="soft"
                    />
                  </View>
                ) : (
                  <View className="mt-4 gap-[14px]">
                    <LibraryHubRow
                      title={librarySectionTitle.saved}
                      detail={`${savedCount} ${
                        savedCount === 1 ? "story" : "stories"
                      }`}
                      icon={icons.saved}
                      iconTint={colors.primary}
                      iconBackground="#EDE4F5"
                      onPress={() => router.push(librarySectionRoute("saved"))}
                    />
                    <LibraryHubRow
                      title={librarySectionTitle.following}
                      detail={`${followingCount} creators and publications`}
                      icon={icons.plus}
                      iconTint="#A64E55"
                      iconBackground="#F4E5DD"
                      onPress={() =>
                        router.push(librarySectionRoute("following"))
                      }
                    />
                  </View>
                )}
                <AppText
                  accessibilityRole="header"
                  className="mt-[28px] font-display text-[19px] leading-[23px] text-ink"
                >
                  {libraryCopy.offlineSection}
                </AppText>
                <View className="mt-[23px] flex-row gap-[14px]">
                  <LibraryHubTile
                    title={librarySectionTitle.downloads}
                    detail={`${downloadsCount} ready offline`}
                    icon={icons.downloads}
                    accent="#0F6973"
                    onPress={() =>
                      router.push(librarySectionRoute("downloads"))
                    }
                  />
                  <LibraryHubTile
                    title={librarySectionTitle.history}
                    detail="Recently played"
                    icon={icons.historyEmpty}
                    accent={colors.primary}
                    onPress={() => router.push(librarySectionRoute("history"))}
                  />
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </AppScreen>
  );
}
