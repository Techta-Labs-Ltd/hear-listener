import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { View } from "@/tw";

export function LibrarySkeleton() {
  return (
    <View className="gap-6 pt-2">
      <View className="flex-row items-start justify-between">
        <View className="gap-2.5">
          <SkeletonBlock className="h-3.5 w-20 rounded-full" />
          <SkeletonBlock className="h-9 w-32 rounded-xl" />
        </View>
        <SkeletonBlock className="h-10 w-10 rounded-full" />
      </View>

      <View className="gap-3 pt-2">
        <SkeletonBlock className="h-5 w-24 rounded-md" />
        <View className="gap-3">
          <View className="h-[86px] rounded-[20px] border border-border bg-surface p-4 flex-row items-center gap-3.5">
            <SkeletonBlock className="h-12 w-12 rounded-full" />
            <View className="flex-1 gap-2">
              <SkeletonBlock className="h-4 w-1/2 rounded-md" />
              <SkeletonBlock className="h-3 w-1/3 rounded-md" tone="soft" />
            </View>
          </View>
          <View className="h-[86px] rounded-[20px] border border-border bg-surface p-4 flex-row items-center gap-3.5">
            <SkeletonBlock className="h-12 w-12 rounded-full" />
            <View className="flex-1 gap-2">
              <SkeletonBlock className="h-4 w-1/2 rounded-md" />
              <SkeletonBlock className="h-3 w-1/3 rounded-md" tone="soft" />
            </View>
          </View>
        </View>
      </View>

      <View className="gap-3 pt-2">
        <SkeletonBlock className="h-5 w-28 rounded-md" />
        <View className="flex-row gap-3.5">
          <SkeletonBlock className="h-32 flex-1 rounded-[20px]" />
          <SkeletonBlock className="h-32 flex-1 rounded-[20px]" />
        </View>
      </View>
    </View>
  );
}

export function SectionListSkeleton() {
  return (
    <View className="gap-4 pt-4">
      <View className="gap-2 pb-2">
        <SkeletonBlock className="h-3.5 w-24 rounded-full" />
        <SkeletonBlock className="h-8 w-44 rounded-xl" />
      </View>
      <View className="gap-3">
        {[1, 2, 3].map((key) => (
          <View
            key={key}
            className="rounded-[20px] border border-border bg-surface p-4 flex-row items-center gap-3.5"
          >
            <SkeletonBlock className="h-16 w-16 rounded-xl" />
            <View className="flex-1 gap-2">
              <SkeletonBlock className="h-4 w-3/4 rounded-md" />
              <SkeletonBlock className="h-3 w-1/2 rounded-md" tone="soft" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
