import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { View } from "@/tw";

export function DiscoverSkeleton() {
  return (
    <View className="gap-6 pt-2">
      <View className="gap-2.5">
        <SkeletonBlock className="h-3.5 w-24 rounded-full" />
        <SkeletonBlock className="h-9 w-40 rounded-xl" />
      </View>

      <SkeletonBlock className="h-12 w-full rounded-[16px]" />

      <View className="rounded-[24px] border border-border bg-surface p-5 gap-3">
        <SkeletonBlock className="h-3.5 w-28 rounded-full" />
        <SkeletonBlock className="h-7 w-4/5 rounded-lg" />
        <SkeletonBlock className="h-4 w-3/5 rounded-lg" tone="soft" />
        <SkeletonBlock className="mt-2 h-11 w-32 rounded-full" />
      </View>

      <View className="gap-3">
        <SkeletonBlock className="h-6 w-24 rounded-lg" />
        <View className="flex-row gap-3">
          <SkeletonBlock className="h-10 w-28 rounded-full" />
          <SkeletonBlock className="h-10 w-24 rounded-full" />
          <SkeletonBlock className="h-10 w-28 rounded-full" />
        </View>
      </View>

      <View className="gap-3">
        <SkeletonBlock className="h-6 w-36 rounded-lg" />
        <View className="rounded-[20px] border border-border bg-surface p-4 flex-row items-center gap-3.5">
          <SkeletonBlock className="h-16 w-16 rounded-xl" />
          <View className="flex-1 gap-2">
            <SkeletonBlock className="h-4 w-3/4 rounded-lg" />
            <SkeletonBlock className="h-3 w-1/2 rounded-lg" tone="soft" />
          </View>
        </View>
      </View>
    </View>
  );
}
