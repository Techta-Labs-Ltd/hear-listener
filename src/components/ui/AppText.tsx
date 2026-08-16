import { Text } from "@/tw";
import type { AppTextProps } from "@/types";
import { cn } from "@/utils/styles";

const variants = {
  overline: "font-body-bold text-overline tracking-wide",
  label: "text-label",
  body: "text-base leading-6",
  heading: "font-display text-heading",
  title: "font-body-bold text-title tracking-tight",
} as const;

const tones = {
  default: "text-ink",
  muted: "text-muted",
  primary: "text-primary",
  inverse: "text-surface",
  danger: "text-danger",
  success: "text-success",
} as const;

export function AppText({
  tone = "default",
  variant = "body",
  className,
  style,
  ...props
}: AppTextProps) {
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={2}
      className={cn("font-body", variants[variant], tones[tone], className)}
      style={style}
      {...props}
    />
  );
}
