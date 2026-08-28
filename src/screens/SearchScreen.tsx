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
import { Pressable, ScrollView, View } from "@/tw";
import { icons } from "@/utils/icons/app-icons";
import { safeBack } from "@/utils/navigation";

export function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
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
      screenTitle="Voice results"
      screenOrientation={`Hear! audio${query ? ` for ${query}` : ""}. Say play the first result, ask for different audio, or go back.`}
      voiceCommands={[
        "play the first result",
        "find local news",
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
        <View className="mt-2 flex-row items-start gap-2">
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
          <View className="min-h-[52px] flex-1 justify-center pr-2">
            <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
              VOICE RESULTS
            </AppText>
            <AppText
              accessibilityRole="header"
              className="mt-1 font-display text-[26px] leading-[31px] text-ink"
            >
              {query ? `Audio for “${query}”` : "Latest Hear! audio"}
            </AppText>
          </View>
        </View>
        <AppText
          accessibilityLiveRegion="polite"
          tone="muted"
          className="mt-4 text-xs sm:text-[13px] leading-[15px]"
        >
          {resultsSummary}
        </AppText>
        {search.loading ? (
          <SearchSkeleton />
        ) : search.error ? (
          <EmptyState
            icon={icons.audioOutput}
            title="Audio could not load"
            description={search.error}
            actionLabel="Try loading again"
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
                No matching audio is available. Shake device and ask for a
                different topic, creator, or publication.
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
          text="Shake device and say “Play the first result” or ask for different audio."
          className="mt-6 sm:mt-[33px]"
        />
      </ScrollView>
    </AppScreen>
  );
}
