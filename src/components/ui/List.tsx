import { SymbolView } from "@/components/ui/AppIcon";
import { Switch } from "react-native";
import { Pressable, View } from "@/tw";
import { colors } from "@/constants/theme";
import { icons } from "@/utils/icons/app-icons";
import { AppText } from "./AppText";
import type { ListRowProps, ListSectionProps, ToggleRowProps } from "@/types";

export function ListSection({
  label,
  children,
}: ListSectionProps) {
  return (
    <View className="gap-2">
      {label ? (
        <AppText variant="overline" tone="primary">
          {label}
        </AppText>
      ) : null}
      <View className="overflow-hidden border-y border-border bg-surface">{children}</View>
    </View>
  );
}

export function ListRow({
  title,
  detail,
  icon,
  leading,
  trailing,
  onPress,
}: ListRowProps) {
  const content = (
    <>
      {leading ??
        (icon ? (
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary-soft">
            <SymbolView
              name={icon as never}
              size={20}
              tintColor={colors.primary}
            />
          </View>
        ) : null)}
      <View className="flex-1 gap-0.5">
        <AppText variant="heading" className="text-base">
          {title}
        </AppText>
        {detail ? (
          <AppText variant="label" tone="muted">
            {detail}
          </AppText>
        ) : null}
      </View>
      {trailing ??
        (onPress ? (
          <SymbolView
            name={icons.disclosure}
            size={16}
            tintColor={colors.textMuted}
          />
        ) : null)}
    </>
  );
  if (!onPress) return <View className="min-h-19 flex-row items-center gap-3 border-b border-border p-4">{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${title}. ${detail}` : title}
      onPress={onPress}
      className="min-h-19 flex-row items-center gap-3 border-b border-border p-4 active:bg-primary-soft"
    >
      {content}
    </Pressable>
  );
}

export function ToggleRow({
  title,
  detail,
  value,
  onChange,
}: ToggleRowProps) {
  return (
    <ListRow
      title={title}
      detail={detail}
      trailing={
        <Switch
          accessibilityLabel={title}
          value={value}
          onValueChange={onChange}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      }
    />
  );
}
