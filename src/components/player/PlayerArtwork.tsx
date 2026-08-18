import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "@/components/ui/AppText";
import { View } from "@/tw";
import { stories } from "@/data/catalogue";
import type { PlayerArtworkProps } from "@/types";
import { cn } from "@/utils/styles";

const ARTWORK_GRADIENTS = [
  ["#A64E55", "#E7A17E"],
  ["#0F6973", "#62B2AA"],
  ["#4C3D8F", "#9C78D8"],
] as const;

export function artworkGradient(index: number) {
  return ARTWORK_GRADIENTS[index % ARTWORK_GRADIENTS.length];
}

export function PlayerArtwork({ item, size = "player", className }: PlayerArtworkProps) {
  const index = stories.findIndex((story) => story.id === item.id);
  const gradient = artworkGradient(Math.max(0, index));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn(
        size === "finished"
          ? "h-[262px] w-[262px] self-center"
          : "aspect-square w-full",
        className,
      )}
    >
      <LinearGradient
        colors={[gradient[0], gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, borderRadius: 28, padding: 26, justifyContent: "space-between" }}
      >
        <AppText className="text-[11px] leading-[13px] tracking-[0.4px] text-white/90">
          {item.creator.toUpperCase()}
        </AppText>
        <AppText
          className={cn(
            "font-display text-white",
            size === "finished"
              ? "text-[30px] leading-9"
              : "text-[35px] leading-[42px]",
          )}
          numberOfLines={2}
        >
          {item.title.toUpperCase()}
        </AppText>
      </LinearGradient>
    </View>
  );
}
