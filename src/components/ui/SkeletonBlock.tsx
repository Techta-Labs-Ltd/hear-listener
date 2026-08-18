import { View } from "@/tw";
import type { SkeletonBlockProps } from "@/types";
import { cn } from "@/utils/styles";

export function SkeletonBlock({ tone = "default", className }: SkeletonBlockProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn(tone === "soft" ? "bg-skeleton-soft" : "bg-skeleton", className)}
    />
  );
}
