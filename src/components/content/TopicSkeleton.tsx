import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { View } from "@/tw";

export function TopicSkeleton() {
  return (
    <View className="gap-5 pt-2">
      <View className="flex-row items-center gap-3">
        <SkeletonBlock className="h-9 w-9 rounded-full" />
        <SkeletonBlock className="h-3.5 w-24 rounded-full" />
      </View>
      <View className="gap-2">
        <SkeletonBlock className="h-8 w-48 rounded-xl" />
        <SkeletonBlock className="h-4 w-64 rounded-md" tone="soft" />
      </View>
      <SkeletonBlock className="h-28 w-full rounded-[24px]" />
      <View className="gap-3 pt-2">
        {[1, 2, 3].map((key) => (
          <View
            key={key}
            className="rounded-[16px] border border-border bg-surface p-4 flex-row items-center gap-3.5"
          >
            <SkeletonBlock className="h-16 w-16 rounded-xl" />
            <View className="flex-1 gap-2">
              <SkeletonBlock className="h-4 w-4/5 rounded-md" />
              <SkeletonBlock className="h-3 w-1/2 rounded-md" tone="soft" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
