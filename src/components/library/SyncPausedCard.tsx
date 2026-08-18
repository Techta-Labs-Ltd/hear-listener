import { AppText } from "@/components/ui/AppText";
import { Pressable, View } from "@/tw";
import type { SyncPausedCardProps } from "@/types";
import { cn } from "@/utils/styles";
import { ActivityIndicator } from "react-native";

export function SyncPausedCard({
  title,
  description,
  actionLabel,
  onRetry,
  retrying = false,
  className,
}: SyncPausedCardProps) {
  return (
    <View className={cn("rounded-[20px] bg-[#fff0ee] p-5", className)}>
      <AppText variant="overline" className="tracking-[0.4px] text-[#a64e55]">
        SYNC PAUSED
      </AppText>
      <AppText className="mt-[12px] font-display text-2xl leading-[29px] text-[#4c2226]">
        {title}
      </AppText>
      <AppText className="mt-2 text-[13px] leading-4 text-[#775b5e]">
        {description}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        accessibilityHint="Retries syncing the library."
        accessibilityState={{ busy: retrying, disabled: retrying }}
        disabled={retrying}
        onPress={onRetry}
        className="mt-4 h-[42px] flex-row items-center justify-center self-start rounded-full bg-[#a64e55] px-5 active:opacity-70"
      >
        {retrying ? (
          <ActivityIndicator accessibilityElementsHidden color="#FFFFFF" size="small" />
        ) : (
          <AppText className="font-body-bold text-xs leading-[15px] text-white">
            {actionLabel}
          </AppText>
        )}
      </Pressable>
    </View>
  );
}
