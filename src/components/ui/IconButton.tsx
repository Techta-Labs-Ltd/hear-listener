import { SymbolView } from "@/components/ui/AppIcon";
import { Pressable } from "@/tw";
import { colors } from "@/constants/theme";
import type { IconButtonProps } from "@/types";
import { cn } from "@/utils/styles";

export function IconButton({
  symbol,
  label,
  onPress,
  disabled = false,
  accessibilityHint,
  className,
  tintColor,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        "h-12 w-12 items-center justify-center rounded-full",
        disabled ? "opacity-50" : "active:bg-primary-soft",
        className
      )}
    >
      <SymbolView name={symbol as never} size={22} tintColor={tintColor ?? colors.text} />
    </Pressable>
  );
}
