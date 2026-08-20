import { AppText } from "@/components/ui/AppText";
import { stories } from "@/data/catalogue";
import { View } from "@/tw";
import type { PlayerArtworkProps } from "@/types";
import { artworkGradient } from "@/utils/artwork";
import { cn } from "@/utils/styles";
import { LinearGradient } from "expo-linear-gradient";

export function PlayerArtwork({
  item,
  size = "player",
  className,
}: PlayerArtworkProps) {
  const index = stories.findIndex((story) => story.id === item.id);
  const gradient = artworkGradient(Math.max(0, index));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn(
        size === "finished"
          ? "h-[170px] w-[170px] sm:h-[220px] sm:w-[220px] md:h-[262px] md:w-[262px] self-center"
          : "aspect-square w-full max-w-[240px] sm:max-w-[320px] md:max-w-[380px] self-center",
        className,
      )}
    >
      <LinearGradient
        colors={[gradient[0], gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flex: 1,
          borderRadius: 24,
          padding: 20,
          justifyContent: "space-between",
        }}
      >
        <AppText className="text-[11px] leading-[13px] tracking-[0.4px] text-white/90">
          {item.creator.toUpperCase()}
        </AppText>
        <AppText
          className={cn(
            "font-display text-white",
            size === "finished"
              ? "text-[22px] sm:text-[26px] md:text-[30px] leading-[26px] sm:leading-8 md:leading-9"
              : "text-[24px] sm:text-[30px] md:text-[35px] leading-[28px] sm:leading-[36px] md:leading-[42px]",
          )}
          numberOfLines={2}
        >
          {item.title.toUpperCase()}
        </AppText>
      </LinearGradient>
    </View>
  );
}
