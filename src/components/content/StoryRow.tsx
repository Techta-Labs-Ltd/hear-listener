import { useRouter } from "expo-router";
import { SymbolView } from "@/components/ui/AppIcon";
import { AppText } from "@/components/ui/AppText";
import { Pressable, View } from "@/tw";
import { usePlayback } from "@/stores";
import { routes } from "@/navigation/routes";
import { icons } from "@/utils/icons/app-icons";
import type { StoryRowProps } from "@/types";
import { cn } from "@/utils/styles";

export function StoryRow({
  item,
  subtitle,
  thumbSize = "sm",
  showPlay = false,
  trailing,
  onPress,
  className,
}: StoryRowProps) {
  const router = useRouter();
  const playback = usePlayback();
  const subtitleText = subtitle ?? `${item.duration} · ${item.creator}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Play ${item.title}`}
      accessibilityHint={`Plays ${item.title} and opens the player.`}
      onPress={
        onPress ??
        (() => {
          playback.play(item);
          router.push(routes.player);
        })
      }
      className={cn(
        "min-h-[76px] flex-row items-center gap-3.5 rounded-[22px] border border-border/60 bg-surface p-3.5 shadow-sm active:opacity-90",
        className,
      )}
    >
      {thumbSize !== "none" ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className={cn(
            thumbSize === "md"
              ? "h-[74px] w-[74px] sm:h-[80px] sm:w-[80px] rounded-[18px]"
              : "h-[56px] w-[56px] rounded-[14px]",
          )}
          style={{ backgroundColor: item.color || "#0F7B7A" }}
        />
      ) : null}
      <View className="flex-1 gap-1">
        <AppText
          className="font-body-bold text-[14px] sm:text-[15px] leading-[18px] text-ink"
          numberOfLines={2}
        >
          {item.title}
        </AppText>
        <AppText
          tone="muted"
          className="text-xs sm:text-[13px] leading-4 text-[#665F69]"
          numberOfLines={1}
        >
          {subtitleText}
        </AppText>
      </View>
      {showPlay ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="h-11 w-11 items-center justify-center rounded-full bg-[#271136]"
        >
          <SymbolView name={icons.play} size={16} tintColor="#FFFFFF" />
        </View>
      ) : null}
      {trailing}
    </Pressable>
  );
}
