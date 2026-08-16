import { SymbolView } from "@/components/ui/AppIcon";
import { View } from "@/tw";
import { colors } from "@/constants/theme";
import type { EmptyStateProps } from "@/types";
import { AppText } from "./AppText";
import { Button } from "./Button";
export function EmptyState({
  title,
  description,
  icon = "tray",
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="items-start gap-3 border-y border-border bg-surface p-6">
      <View className="h-13 w-13 items-center justify-center rounded-full bg-primary-soft">
        <SymbolView name={icon as never} size={26} tintColor={colors.primary} />
      </View>
      <AppText variant="heading">
        {title}
      </AppText>
      <AppText tone="muted" className="max-w-[420px]">
        {description}
      </AppText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="secondary" onPress={onAction} />
      ) : null}
    </View>
  );
}
