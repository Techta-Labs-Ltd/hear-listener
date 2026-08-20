import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { View } from "@/tw";

export function HomeSkeleton() {
  return (
    <View className="gap-6 pt-2">
      <View className="flex-row items-start justify-between">
        <View className="gap-2.5">
          <SkeletonBlock className="h-3.5 w-24 rounded-full" />
          <SkeletonBlock className="h-9 w-48 rounded-xl" />
        </View>
        <SkeletonBlock className="h-10 w-10 rounded-full" />
      </View>

      <View className="rounded-[24px] border border-border bg-surface p-5 gap-3.5">
        <View className="flex-row items-center justify-between">
          <SkeletonBlock className="h-3 w-28 rounded-full" />
          <SkeletonBlock className="h-3 w-16 rounded-full" />
        </View>
        <SkeletonBlock className="h-7 w-3/4 rounded-lg" />
        <SkeletonBlock className="h-4 w-1/2 rounded-lg" tone="soft" />
        <SkeletonBlock className="mt-2 h-1.5 w-full rounded-full" />
      </View>

      <View className="gap-3 pt-2">
        <View className="flex-row items-center justify-between">
          <SkeletonBlock className="h-6 w-32 rounded-lg" />
          <SkeletonBlock className="h-4 w-14 rounded-full" />
        </View>
        <View className="flex-row gap-3.5">
          <View className="flex-1 rounded-[20px] border border-border bg-surface p-4 gap-3">
            <SkeletonBlock className="h-28 w-full rounded-xl" />
            <SkeletonBlock className="h-4 w-3/4 rounded-lg" />
            <SkeletonBlock className="h-3 w-1/2 rounded-lg" tone="soft" />
          </View>
          <View className="flex-1 rounded-[20px] border border-border bg-surface p-4 gap-3">
            <SkeletonBlock className="h-28 w-full rounded-xl" />
            <SkeletonBlock className="h-4 w-3/4 rounded-lg" />
            <SkeletonBlock className="h-3 w-1/2 rounded-lg" tone="soft" />
          </View>
        </View>
      </View>
    </View>
  );
}
