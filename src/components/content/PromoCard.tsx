import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "@/components/ui/AppIcon";
import { AppText } from "@/components/ui/AppText";
import { Pressable, View } from "@/tw";
import { colors } from "@/constants/theme";
import { icons } from "@/utils/icons/app-icons";
import type { PromoCardProps } from "@/types";
import { cn } from "@/utils/styles";

const EDITOR_GRADIENT = ["#4C3D8F", "#9C78D8"] as const;

export function PromoCard({
  eyebrow,
  title,
  description,
  meta,
  playLabel,
  tone = "brand",
  compact = false,
  onPress,
  accessibilityHint,
  accessibilityValue,
  className,
}: PromoCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityValue={accessibilityValue}
      onPress={onPress}
      className={cn("active:opacity-90", className)}
    >
      <LinearGradient
        colors={
          tone === "editor"
            ? [...EDITOR_GRADIENT]
            : ["#351B52", "#351B52"]
        }
        locations={tone === "editor" ? [0, 1] : [0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          minHeight: compact ? 100 : description ? 160 : 150,
          borderRadius: 22,
          padding: 20,
          justifyContent: "space-between",
        }}
      >
        <View className="gap-2 sm:gap-3">
          <AppText variant="overline" className="tracking-[0.4px] text-voice-muted">
            {eyebrow}
          </AppText>
          <AppText
            className={cn(
              "font-display text-white",
              description
                ? "text-[21px] sm:text-[25px] leading-[26px] sm:leading-[30px]"
                : "text-[20px] sm:text-2xl leading-[25px] sm:leading-[29px]",
            )}
          >
            {title}
          </AppText>
          {description ? (
            <AppText
              className="text-xs sm:text-[13px] leading-4 text-voice-muted"
              numberOfLines={2}
            >
              {description}
            </AppText>
          ) : null}
        </View>
        <View className="mt-2 flex-row items-end justify-between">
          {meta ? (
            <AppText
              className="text-[11px] sm:text-xs leading-[15px] text-voice-muted"
              numberOfLines={1}
            >
              {meta}
            </AppText>
          ) : (
            <View />
          )}
          {playLabel ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className={cn(
                "items-center justify-center rounded-full bg-surface",
                tone === "editor"
                  ? "h-10 w-10 sm:h-[46px] sm:w-[46px]"
                  : "h-10 w-10 sm:h-12 sm:w-12",
              )}
            >
              <SymbolView
                name={icons.play}
                size={tone === "editor" ? 15 : 17}
                tintColor={colors.voicePanel}
              />
            </View>
          ) : null}
        </View>
      </LinearGradient>
    </Pressable>
  );
}
