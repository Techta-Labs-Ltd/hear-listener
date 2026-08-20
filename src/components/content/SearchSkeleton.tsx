import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { View } from "@/tw";

export function SearchSkeleton() {
  return (
    <View className="gap-4 pt-4">
      <View className="gap-2">
        <SkeletonBlock className="h-6 w-28 rounded-md" />
        <SkeletonBlock className="h-3 w-40 rounded-full" tone="soft" />
      </View>
      <View className="gap-3 pt-2">
        {[1, 2, 3].map((key) => (
          <View
            key={key}
            className="rounded-[16px] border border-border bg-surface p-3 flex-row items-center gap-3.5"
          >
            <SkeletonBlock className="h-[76px] w-[76px] rounded-[12px]" />
            <View className="flex-1 gap-2">
              <SkeletonBlock className="h-3 w-16 rounded-full" />
              <SkeletonBlock className="h-4 w-4/5 rounded-md" />
              <SkeletonBlock className="h-3 w-3/5 rounded-md" tone="soft" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
