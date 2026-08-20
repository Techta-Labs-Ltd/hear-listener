import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StoryRow } from "@/components/content/StoryRow";
import { ShowResult } from "@/components/content/ShowResult";
import { SearchSkeleton } from "@/components/content/SearchSkeleton";
import { SymbolView } from "@/components/ui/AppIcon";
import { AppScreen } from "@/components/ui/AppScreen";
import { AppText } from "@/components/ui/AppText";
import { VoiceTip } from "@/components/voice/VoiceTip";
import { colors } from "@/constants/theme";
import { routes } from "@/navigation/routes";
import { usePlayback } from "@/stores";
import { useVoice } from "@/hooks/useVoice";
import { Pressable, ScrollView, View } from "@/tw";
import { icons } from "@/utils/icons/app-icons";
import { safeBack } from "@/utils/navigation";
import { firstStoryForEntity, searchCatalogue } from "@/utils/search";

export function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const playback = usePlayback();
  const voice = useVoice();
  const [query] = useState(params.q ?? "technology podcasts");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setSearching(true);
    const timer = setTimeout(() => setSearching(false), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => searchCatalogue(query), [query]);

  const resultsSummary = useMemo(() => {
    const audioCount = results.audio.length;
    const showCount = results.shows.length;
    const audioLabel = audioCount === 1 ? "audio story" : "audio stories";
    const showLabel = showCount === 1 ? "show" : "shows";
    return `${audioCount} ${audioLabel} and ${showCount} ${showLabel}`;
  }, [results]);

  return (
    <AppScreen
      screenTitle="Search Results"
      screenOrientation={`Search results for ${query}. Say play the first result, search for something else, or go back.`}
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
            accessibilityLabel={`Search query: ${query}. Tap to speak a new search.`}
            accessibilityHint="Starts voice listening to speak a search query."
            onPress={() =>
              void voice.startVoiceSession({ source: "contextualAction" })
            }
            className="h-[52px] flex-1 flex-row items-center justify-between rounded-full border border-border/50 bg-surface px-5 shadow-sm active:opacity-85"
          >
            <AppText className="font-body text-[15px] leading-[18px] text-ink">
              {query}
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
              {results.shows.map((entity) => (
                <ShowResult
                  key={entity.id}
                  entity={entity}
                  onPlay={() => {
                    const story = firstStoryForEntity(entity);
                    if (!story) return;
                    playback.play(story);
                    router.push(routes.player);
                  }}
                />
              ))}
              {results.audio.map((item) => (
                <StoryRow key={item.id} item={item} thumbSize="md" showPlay />
              ))}
            </View>
            {results.audio.length === 0 && results.shows.length === 0 ? (
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
