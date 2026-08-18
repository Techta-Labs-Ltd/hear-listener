import { StoryRow } from "@/components/content/StoryRow";
import { SymbolView } from "@/components/ui/AppIcon";
import { AppText } from "@/components/ui/AppText";
import { VoiceTip } from "@/components/voice/VoiceTip";
import { colors, fontFamily } from "@/constants/theme";
import { routes } from "@/navigation/routes";
import { usePlayback } from "@/stores";
import { Pressable, ScrollView, View } from "@/tw";
import type { Entity } from "@/types";
import { icons } from "@/utils/icons/app-icons";
import { firstStoryForEntity, searchCatalogue } from "@/utils/search";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { TextInput } from "react-native";

export function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const playback = usePlayback();
  const [query, setQuery] = useState(params.q ?? "technology podcasts");
  const results = useMemo(() => searchCatalogue(query), [query]);
  const resultsSummary = useMemo(() => {
    const audioCount = results.audio.length;
    const showCount = results.shows.length;
    const audioLabel = audioCount === 1 ? "audio story" : "audio stories";
    const showLabel = showCount === 1 ? "show" : "shows";
    if (audioCount === 0 && showCount === 0) return "No results yet";
    if (audioCount === 0) return showCount + " " + showLabel;
    if (showCount === 0) return audioCount + " " + audioLabel;
    return audioCount + " " + audioLabel + " and " + showCount + " " + showLabel;
  }, [results]);

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView
        contentContainerClassName="px-5 pb-12"
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-2 flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Discover"
            accessibilityHint="Returns to the Discover tab."
            onPress={() => router.back()}
            hitSlop={6}
            className="h-12 w-12 -ml-2 items-start justify-center active:opacity-70"
          >
            <SymbolView name={icons.back} size={24} tintColor={colors.text} />
          </Pressable>
          <View className="h-[50px] flex-1 flex-row items-center rounded-[16px] border border-border bg-surface px-4">
            <TextInput
              accessibilityLabel="Search audio, topics, creators"
              autoCorrect={false}
              className="flex-1 text-sm leading-[17px] text-ink"
              value={query}
              onChangeText={setQuery}
              placeholder="Search audio, topics, creators"
              placeholderTextColor="#7b737d"
              style={{ fontFamily: fontFamily.body }}
            />
          </View>
        </View>
        <AppText accessibilityRole="header" className="mt-6 font-display text-2xl leading-[29px] text-ink">
          Results
        </AppText>
        <AppText tone="muted" className="mt-[11px] text-xs leading-[15px]">
          {resultsSummary}
        </AppText>
        <View className="mt-[24px] gap-[14px]">
          {results.shows.map((entity) => (
            <ShowResult key={entity.id} entity={entity} onPlay={() => {
              const story = firstStoryForEntity(entity);
              if (!story) return;
              playback.play(story);
              router.push(routes.player);
            }} />
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
        <VoiceTip
          eyebrow="VOICE SHORTCUT"
          text="Say “Play the first result.”"
          className="mt-[33px]"
        />
      </ScrollView>
    </View>
  );
}

function ShowResult({ entity, onPlay }: { entity: Entity; onPlay: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entity.name}, ${entity.kind}`}
      accessibilityHint="Plays a story from this show."
      onPress={onPlay}
      className="flex-row items-center gap-[14px] rounded-[16px] border border-border bg-surface p-3 active:opacity-90"
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="ml-[2px] h-[82px] w-[82px] items-center justify-center rounded-[12px]"
        style={{ backgroundColor: "#4C3D8F" }}
      >
        <SymbolView name={icons.speaker} size={28} tintColor="#9C78D8" />
      </View>
      <View className="flex-1 gap-1.5">
        <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
          {entity.kind === "creator" ? "CREATOR" : "SHOW"}
        </AppText>
        <AppText className="font-body-bold text-sm leading-[17px] text-ink" numberOfLines={1}>
          {entity.name}
        </AppText>
        <AppText tone="muted" className="text-[11px] leading-[13px]" numberOfLines={1}>
          {entity.description}
        </AppText>
      </View>
    </Pressable>
  );
}
