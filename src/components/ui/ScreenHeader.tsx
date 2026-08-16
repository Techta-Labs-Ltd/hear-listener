import { View } from "@/tw";
import { AppText } from "./AppText";
import { IconButton } from "./IconButton";
import { icons } from "@/utils/icons/app-icons";
import type { ScreenHeaderProps } from "@/types";
export function ScreenHeader({
  title,
  eyebrow,
  onBack,
  backLabel = "Go back",
  action,
}: ScreenHeaderProps) {
  return (
    <View className="min-h-16 flex-row items-center justify-between px-3">
      {onBack ? (
        <IconButton symbol={icons.back} label={backLabel} onPress={onBack} />
      ) : (
        <View className="w-12" />
      )}
      <View className="items-center">
        {eyebrow ? (
          <AppText variant="overline" tone="primary">
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant="heading">{title}</AppText>
      </View>
      {action ?? <View className="w-12" />}
    </View>
  );
}
