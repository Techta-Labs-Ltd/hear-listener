import { ActivityIndicator, GestureResponderEvent } from "react-native";
import { Pressable } from "@/tw";
import type { ButtonProps } from "@/types";
import { AppText } from "./AppText";
import { cn } from "@/utils/styles";
import { colors } from "@/constants/theme";
import { playClick } from "@/lib/audio/one-shots";
import { appHaptics } from "@/lib/haptics";

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "regular",
  disabled = false,
  loading = false,
  accessibilityHint,
  className,
}: ButtonProps) {
  const secondary = variant === "secondary";
  const ghost = variant === "ghost";
  const inverse = variant === "inverse";
  const handlePress = async (e: GestureResponderEvent) => {
    void appHaptics.changed();
    playClick();
    if (onPress) onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: loading, disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={handlePress}
      className={cn(
        "min-h-12 flex-row items-center justify-center gap-2 rounded-xl active:opacity-70",
        size === "compact" ? "px-4" : "px-6",
        secondary && "border border-primary bg-surface",
        inverse && "bg-surface",
        ghost && "bg-transparent",
        !secondary && !ghost && !inverse && "bg-primary",
        (disabled || loading) && "opacity-50",
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator
          accessibilityElementsHidden
          color={secondary || ghost || inverse ? colors.primary : colors.surface}
          size="small"
        />
      ) : null}
      <AppText
        variant="heading"
        tone={secondary || ghost || inverse ? "primary" : "inverse"}
        className="text-base leading-6"
      >
        {loading ? `${label}…` : label}
      </AppText>
    </Pressable>
  );
}
