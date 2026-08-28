import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StoryRow } from "@/components/content/StoryRow";
import { SearchSkeleton } from "@/components/content/SearchSkeleton";
import { SymbolView } from "@/components/ui/AppIcon";
import { AppScreen } from "@/components/ui/AppScreen";
import { AppText } from "@/components/ui/AppText";
import { VoiceTip } from "@/components/voice/VoiceTip";
import { colors } from "@/constants/theme";
import { routes } from "@/navigation/routes";
import { useVoice } from "@/hooks/useVoice";
import { searchHearCatalogue } from "@/services/content/hear-catalogue-service";
import { Pressable, ScrollView, View } from "@/tw";
import { icons } from "@/utils/icons/app-icons";
import { safeBack } from "@/utils/navigation";
import type { ContentItem } from "@/types";

export function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const voice = useVoice();
  const [query] = useState(params.q?.trim() ?? "");
  const [searching, setSearching] = useState(true);
  const [results, setResults] = useState<ContentItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void searchHearCatalogue({
      query,
      sort: query ? undefined : "latest",
      limit: 20,
      signal: controller.signal,
    })
      .then((page) => {
        if (!controller.signal.aborted) setResults(page.items);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setResults([]);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Hear! search is unavailable.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearching(false);
      });
    return () => controller.abort();
  }, [query]);

  const resultsSummary = `${results.length} ${
    results.length === 1 ? "audio result" : "audio results"
  }`;

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
        <AppText tone="muted" className="mt-2 sm:mt-[11px] text-xs sm:text-[13px] leading-[15px]">
          {resultsSummary}
        </AppText>
        {searching ? (
          <SearchSkeleton />
        ) : (
          <>
            <View className="mt-5 sm:mt-[24px] gap-3 sm:gap-[14px]">
              {results.map((item) => (
                <StoryRow key={item.id} item={item} thumbSize="md" showPlay />
              ))}
            </View>
            {error ? (
              <AppText tone="muted" className="mt-8 text-center">
                {error}
              </AppText>
            ) : null}
            {!error && results.length === 0 ? (
              <AppText tone="muted" className="mt-8 text-center">
                Nothing matched. Try a topic, creator, or show instead.
              </AppText>
            ) : null}
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
