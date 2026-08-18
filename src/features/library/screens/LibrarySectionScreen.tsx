import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "@/components/ui/AppIcon";
import { StoryRow } from "@/components/content/StoryRow";
import { VoiceTip } from "@/components/voice/VoiceTip";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionPageHeader } from "@/components/library/SectionPageHeader";
import { AppScreen } from "@/components/ui/AppScreen";
import { AppText } from "@/components/ui/AppText";
import { Pressable, ScrollView, View } from "@/tw";
import { colors } from "@/constants/theme";
import { useVoice } from "@/hooks/useVoice";
import { usePreferences } from "@/stores";
import { entities, stories } from "@/data/catalogue";
import type { ContentItem, Entity } from "@/types";
import { parseLibrarySection, routes } from "@/navigation/routes";
import { libraryCopy, librarySectionCopy } from "@/utils/copy/library";
import { icons } from "@/utils/icons/app-icons";

const GRADIENTS = [
  ["#0F6973", "#62B2AA"],
  ["#A64E55", "#E7A17E"],
  ["#4C3D8F", "#9C78D8"],
] as const;

export function LibrarySectionScreen() {
  const activeSection = parseLibrarySection(
    useLocalSearchParams<{ section?: string }>().section,
  );

  return (
    <AppScreen>
      <ScrollView
        contentContainerClassName="px-5 pt-4 pb-[40px]"
        showsVerticalScrollIndicator={false}
      >
        {activeSection === "saved" ? (
          <SavedSection />
        ) : activeSection === "downloads" ? (
          <DownloadsSection />
        ) : activeSection === "following" ? (
          <FollowingSection />
        ) : (
          <HistorySection />
        )}
      </ScrollView>
    </AppScreen>
  );
}

function SavedSection() {
  const router = useRouter();
  const voice = useVoice();
  const { preferences } = usePreferences();
  const copy = librarySectionCopy.saved;
  const saved = stories.filter((item) => preferences.savedIds.includes(item.id));

  if (!saved.length) {
    return (
      <>
        <SectionPageHeader
          small
          eyebrow={copy.eyebrow}
          title={copy.title}
          backLabel={libraryCopy.back}
          onBack={router.back}
        />
        <View className="mt-[94px] h-24 w-24 self-center items-center justify-center rounded-full bg-primary-soft">
          <SymbolView name={icons.savedEmpty} size={32} tintColor={colors.primary} />
        </View>
        <AppText
          accessibilityRole="header"
          className="mt-10 self-center font-display text-[26px] leading-[31px] text-ink"
        >
          {copy.emptyTitle}
        </AppText>
        <AppText tone="muted" className="mt-[17px] self-center text-center text-sm leading-[17px]">
          {copy.emptyDescription}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.browse}
          accessibilityHint="Opens Discover."
          onPress={() => router.push(routes.discover)}
          className="mt-10 h-[54px] w-[274px] self-center items-center justify-center rounded-full bg-voice-canvas active:opacity-70"
        >
          <AppText className="font-body-bold text-[15px] leading-[18px] text-white">
            {copy.browse}
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.tryVoice}
          accessibilityHint="Starts a voice command so you can say Save this."
          onPress={() => void voice.startVoiceSession({ source: "contextualAction" })}
          className="mt-3.5 h-[54px] w-[274px] self-center items-center justify-center rounded-full border border-border bg-surface active:opacity-70"
        >
          <AppText className="font-body-bold text-[15px] leading-[18px] text-voice-canvas">
            {copy.tryVoice}
          </AppText>
        </Pressable>
      </>
    );
  }

  return (
    <>
      <SectionPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        subtitle={`${saved.length} ${saved.length === 1 ? "story" : "stories"} saved`}
        backLabel={libraryCopy.back}
        onBack={router.back}
      />
      <View className="mt-[25px] gap-[13px]">
        {saved.map((item) => (
          <StoryRow key={item.id} item={item} thumbSize="md" showPlay />
        ))}
      </View>
    </>
  );
}

function DownloadsSection() {
  const router = useRouter();
  const { preferences } = usePreferences();
  const copy = librarySectionCopy.downloads;
  const downloads = stories.filter(
    (item) => item.downloaded || preferences.downloadedIds.includes(item.id),
  );

  return (
    <>
      <SectionPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        subtitle={
          downloads.length
            ? `${downloads.length} stories · Ready offline`
            : "Nothing offline yet"
        }
        subtitleClassName={downloads.length ? "text-[#0f6973] font-body-bold" : undefined}
        backLabel={libraryCopy.back}
        onBack={router.back}
      />
      {downloads.length ? (
        <View className="mt-[25px] gap-[14px]">
          {downloads.map((item) => (
            <DownloadedRow key={item.id} item={item} />
          ))}
          <VoiceTip eyebrow={copy.voiceEyebrow} text={copy.voiceText} tone="mint" className="mt-[12px]" />
        </View>
      ) : (
        <EmptyState
          icon={icons.downloadEmpty}
          title={copy.emptyTitle}
          description={copy.emptyDescription}
        />
      )}
    </>
  );
}

function DownloadedRow({ item }: { item: ContentItem }) {
  return (
    <StoryRow
      item={item}
      thumbSize="md"
      trailing={
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <SymbolView name={icons.success} size={16} tintColor="#0F6973" />
        </View>
      }
    />
  );
}

function FollowingSection() {
  const router = useRouter();
  const { preferences } = usePreferences();
  const copy = librarySectionCopy.following;
  const followed = entities.filter((entity) =>
    preferences.followingIds.includes(entity.id),
  );

  return (
    <>
      <SectionPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        subtitle={copy.subtitle}
        backLabel={libraryCopy.back}
        onBack={router.back}
      />
      {followed.length ? (
        <View className="mt-[19px] gap-[12px]">
          {followed.map((entity, index) => (
            <FollowingRow key={entity.id} entity={entity} index={index} />
          ))}
          <VoiceTip eyebrow={copy.voiceEyebrow} text={copy.voiceText} className="mt-[15px]" />
        </View>
      ) : (
        <EmptyState
          icon={icons.followingEmpty}
          title={copy.emptyTitle}
          description={copy.emptyDescription}
        />
      )}
    </>
  );
}

function FollowingRow({ entity, index }: { entity: Entity; index: number }) {
  const { preferences, updatePreferences } = usePreferences();
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const storyCount = stories.filter((item) => item.creator === entity.name).length;

  return (
    <View className="flex-row items-center gap-4 py-2" accessible>
      <LinearGradient
        colors={[gradient[0], gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: 76, height: 76, borderRadius: 38 }}
      />
      <View className="flex-1 gap-1.5">
        <AppText className="font-body-bold text-sm leading-[17px] text-ink" numberOfLines={1}>
          {entity.name}
        </AppText>
        <AppText tone="muted" className="text-[11px] leading-[13px]" numberOfLines={1}>
          {entity.description} · {storyCount} {storyCount === 1 ? "story" : "stories"}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${libraryCopy.unfollow} ${entity.name}`}
        accessibilityHint="Stops following this creator or publication."
        onPress={() =>
          updatePreferences({
            followingIds: preferences.followingIds.filter((id) => id !== entity.id),
          })
        }
        className="h-[38px] items-center justify-center rounded-full bg-primary-soft px-4 active:opacity-70"
      >
        <AppText className="font-body-bold text-xs leading-[15px] text-primary">
          Following
        </AppText>
      </Pressable>
    </View>
  );
}

const HISTORY: {
  label: string;
  rows: { storyId: string; meta: string }[];
}[] = [
  {
    label: "TODAY",
    rows: [
      { storyId: "daily", meta: "18 min played · Hear Daily" },
      { storyId: "lagos", meta: "Completed · Community Radio" },
    ],
  },
  {
    label: "YESTERDAY",
    rows: [{ storyId: "city-lab", meta: "9 min played · CityLab" }],
  },
];

function HistorySection() {
  const router = useRouter();
  const copy = librarySectionCopy.history;
  const [cleared, setCleared] = useState(false);
  const groups = HISTORY.filter(
    (group) => !cleared && group.rows.some((row) => stories.some((s) => s.id === row.storyId)),
  );

  return (
    <>
      <SectionPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        backLabel={libraryCopy.back}
        onBack={router.back}
      />
      {groups.length ? (
        <View className="mt-[20px] gap-[13px]">
          {groups.map((group) => (
            <View key={group.label} className="gap-[13px]">
              <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
                {group.label}
              </AppText>
              {group.rows.map((row) => {
                const item = stories.find((story) => story.id === row.storyId);
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
            onPress={() => setCleared(true)}
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
