import { useLocalSearchParams, useRouter } from "expo-router";
import { CataloguePaginationFooter } from "@/components/content/CataloguePaginationFooter";
import { StoryRow } from "@/components/content/StoryRow";
import { SearchSkeleton } from "@/components/content/SearchSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { SymbolView } from "@/components/ui/AppIcon";
import { AppScreen } from "@/components/ui/AppScreen";
import { AppText } from "@/components/ui/AppText";
import { VoiceTip } from "@/components/voice/VoiceTip";
import { colors } from "@/constants/theme";
import { routes } from "@/navigation/routes";
import { useHearCatalogueSearch } from "@/hooks/useHearCatalogueSearch";
import { useLoadMoreOnScroll } from "@/hooks/useLoadMoreOnScroll";
import { useVoice } from "@/hooks/useVoice";
import { Pressable, ScrollView, View } from "@/tw";
import { icons } from "@/utils/icons/app-icons";
import { safeBack } from "@/utils/navigation";

export function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const voice = useVoice();
  const query = params.q?.trim() ?? "";
  const search = useHearCatalogueSearch({
    query,
    sort: query ? undefined : "latest",
  });
  const onScroll = useLoadMoreOnScroll({
    hasMore: search.hasMore,
    loading: search.loadingMore,
    onLoadMore: search.loadNextPage,
  });
  const resultsSummary = search.loading
    ? "Loading audio results"
    : search.items.length > search.total
      ? `${search.items.length} playable tracks loaded`
    : search.total === search.items.length
      ? `${search.total} ${search.total === 1 ? "audio result" : "audio results"}`
      : `Showing ${search.items.length} of ${search.total} audio results`;

  return (
    <AppScreen
      screenTitle="Search Results"
      screenOrientation={`Hear! search results${query ? ` for ${query}` : ""}. Say play the first result, search for something else, or go back.`}
      voiceCommands={[
        "play the first result",
        "search for local news",
        "go back",
        "read this screen",
      ]}
    >
      <ScrollView
        contentContainerClassName="px-4 sm:px-5 pb-12 pt-2"
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={200}
      >
        <View className="mt-2 flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Discover"
            accessibilityHint="Returns to the Discover tab."
            onPress={() => safeBack(router, routes.discover)}
            hitSlop={6}
            className="-ml-2 h-12 w-10 items-start justify-center active:opacity-70"
          >
            <SymbolView name={icons.back} size={24} tintColor={colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Search query: ${query || "latest Hear! audio"}. Shake device to speak a new search.`}
            accessibilityHint="Starts voice listening to speak a search query."
            onPress={() =>
              void voice.startVoiceSession({ source: "contextualAction" })
            }
            className="h-[52px] flex-1 flex-row items-center justify-between rounded-full border border-border/50 bg-surface px-5 shadow-sm active:opacity-85"
          >
            <AppText className="font-body text-[15px] leading-[18px] text-ink">
              {query || "Latest Hear! audio"}
            </AppText>
          </Pressable>
        </View>
        <AppText
          accessibilityRole="header"
          className="mt-6 font-display text-[26px] sm:text-2xl leading-[30px] sm:leading-[29px] text-ink"
        >
          Results
        </AppText>
        <AppText
          accessibilityLiveRegion="polite"
          tone="muted"
          className="mt-2 sm:mt-[11px] text-xs sm:text-[13px] leading-[15px]"
        >
          {resultsSummary}
        </AppText>
        {search.loading ? (
          <SearchSkeleton />
        ) : search.error ? (
          <EmptyState
            icon={icons.search}
            title="Search could not load"
            description={search.error}
            actionLabel="Try search again"
            onAction={search.retry}
          />
        ) : (
          <>
            <View className="mt-5 sm:mt-[24px] gap-3 sm:gap-[14px]">
              {search.items.map((item) => (
                <StoryRow key={item.id} item={item} thumbSize="md" showPlay />
              ))}
            </View>
            {search.items.length === 0 ? (
              <AppText tone="muted" className="mt-8 text-center">
                Nothing matched. Try a topic, creator, or show instead.
              </AppText>
            ) : null}
            <CataloguePaginationFooter
              loading={search.loadingMore}
              hasMore={search.hasMore}
              error={search.loadMoreError}
              onLoadMore={search.loadNextPage}
              className="mt-5"
            />
          </>
        )}
        <VoiceTip
          eyebrow="VOICE SHORTCUT"
          text="Say “Play the first result.”"
          className="mt-6 sm:mt-[33px]"
        />
      </ScrollView>
    </AppScreen>
  );
}
