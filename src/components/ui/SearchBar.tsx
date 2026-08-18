import { SymbolView } from "@/components/ui/AppIcon";
import { AppText } from "@/components/ui/AppText";
import { colors } from "@/constants/theme";
import { Pressable } from "@/tw";
import type { SearchBarProps } from "@/types";
import { icons } from "@/utils/icons/app-icons";
import { cn } from "@/utils/styles";

export function SearchBar({ label, onPress, className }: SearchBarProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens search."
      onPress={onPress}
      className={cn(
        "h-[52px] flex-row items-center gap-2.5 rounded-full border border-border/60 bg-surface px-[18px] active:opacity-90 shadow-sm",
        className,
      )}
    >
      <SymbolView name={icons.search} size={16} tintColor={colors.textMuted} />
      <AppText tone="muted" className="text-[13px] leading-4">
        {label}
      </AppText>
    </Pressable>
  );
}
