import { forwardRef } from "react";
import type { TextInput as NativeTextInput } from "react-native";
import { TextInput, View } from "@/tw";
import { colors } from "@/constants/theme";
import type { InputProps } from "@/types";
import { AppText } from "./AppText";
import { cn } from "@/utils/styles";

export const Input = forwardRef<NativeTextInput, InputProps>(function Input(
  { label, error, hint, className, style, ...props },
  ref,
) {
  const help = error ?? hint;
  return (
    <View className="gap-2">
      <AppText variant="label" className="font-body-bold">
        {label}
      </AppText>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.textMuted}
        className={cn(
          "min-h-13 rounded-xl border border-border bg-surface px-4 font-body text-base text-ink",
          error && "border-danger",
          className,
        )}
        style={style}
        {...props}
      />
      {help ? (
        <AppText variant="label" tone={error ? "danger" : "muted"}>
          {help}
        </AppText>
      ) : null}
    </View>
  );
});
