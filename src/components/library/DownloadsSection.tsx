import { useRouter } from "expo-router";
import { SymbolView } from "@/components/ui/AppIcon";
import { StoryRow } from "@/components/content/StoryRow";
import { VoiceTip } from "@/components/voice/VoiceTip";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionPageHeader } from "@/components/library/SectionPageHeader";
import { View } from "@/tw";
import { usePreferences } from "@/stores";
import { stories } from "@/data/catalogue";
import type { ContentItem } from "@/types";
import { libraryCopy, librarySectionCopy } from "@/utils/copy/library";
import { icons } from "@/utils/icons/app-icons";
import { safeBack } from "@/utils/navigation";

export function DownloadsSection() {
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
        onBack={() => safeBack(router, "/library")}
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
