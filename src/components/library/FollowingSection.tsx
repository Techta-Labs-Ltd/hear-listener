import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { VoiceTip } from "@/components/voice/VoiceTip";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionPageHeader } from "@/components/library/SectionPageHeader";
import { AppText } from "@/components/ui/AppText";
import { Pressable, View } from "@/tw";
import { usePreferences } from "@/stores";
import { entities, stories } from "@/data/catalogue";
import type { Entity } from "@/types";
import { libraryCopy, librarySectionCopy } from "@/utils/copy/library";
import { icons } from "@/utils/icons/app-icons";
import { safeBack } from "@/utils/navigation";

const GRADIENTS = [
  ["#0F6973", "#62B2AA"],
  ["#A64E55", "#E7A17E"],
  ["#4C3D8F", "#9C78D8"],
] as const;

export function FollowingSection() {
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
        onBack={() => safeBack(router, "/library")}
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
