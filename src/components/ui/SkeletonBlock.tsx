import { ShimmerBlock } from "@/components/ui/Shimmer";
import type { SkeletonBlockProps } from "@/types";

export function SkeletonBlock({ tone = "default", className }: SkeletonBlockProps) {
  return <ShimmerBlock tone={tone} className={className} />;
}
