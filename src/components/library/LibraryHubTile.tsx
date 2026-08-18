import { SymbolView } from "@/components/ui/AppIcon";
import { AppText } from "@/components/ui/AppText";
import { Pressable } from "@/tw";
import type { LibraryHubTileProps } from "@/types";
import { cn } from "@/utils/styles";

export function LibraryHubTile({
  title,
  detail,
  icon,
  accent,
  onPress,
  className,
}: LibraryHubTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}.`}
      accessibilityHint="Opens that Library section."
      onPress={onPress}
      className={cn(
        "h-[120px] flex-1 justify-center gap-3 rounded-[20px] border border-border/60 bg-surface p-4 shadow-sm active:opacity-90",
        className,
      )}
    >
      <SymbolView name={icon} size={22} tintColor={accent} />
      <AppText className="font-body-bold text-[14px] leading-[18px] text-ink" numberOfLines={1}>
        {title}
      </AppText>
      <AppText tone="muted" className="text-[12px] leading-4 text-[#665F69]" numberOfLines={1}>
        {detail}
      </AppText>
    </Pressable>
  );
}
