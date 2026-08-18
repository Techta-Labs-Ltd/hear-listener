import { SymbolView } from "@/components/ui/AppIcon";
import { AppText } from "@/components/ui/AppText";
import { colors } from "@/constants/theme";
import { Pressable, View } from "@/tw";
import type { LibraryHubRowProps } from "@/types";
import { icons } from "@/utils/icons/app-icons";

export function LibraryHubRow({
  title,
  detail,
  icon,
  iconTint,
  iconBackground,
  onPress,
}: LibraryHubRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}.`}
      accessibilityHint="Opens that Library section."
      onPress={onPress}
      className="min-h-[86px] flex-row items-center gap-3.5 rounded-[20px] border border-border/60 bg-surface p-4 shadow-sm active:opacity-90"
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="h-11 w-11 items-center justify-center rounded-[14px]"
        style={{ backgroundColor: iconBackground }}
      >
        <SymbolView name={icon} size={18} tintColor={iconTint} />
      </View>
      <View className="flex-1 gap-1">
        <AppText className="font-body-bold text-[15px] leading-5 text-ink">
          {title}
        </AppText>
        <AppText tone="muted" className="text-[13px] leading-4 text-[#665F69]">
          {detail}
        </AppText>
      </View>
      <SymbolView name={icons.disclosure} size={15} tintColor={colors.primary} />
    </Pressable>
  );
}
