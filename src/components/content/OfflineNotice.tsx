import { AppText } from "@/components/ui/AppText";
import { Pressable, View } from "@/tw";
import type { OfflineNoticeProps } from "@/types";
import { cn } from "@/utils/styles";

export function OfflineNotice({ onOpenDownloads, className }: OfflineNoticeProps) {
  return (
    <View className={cn("rounded-[20px] bg-voice-panel p-5", className)}>
      <AppText variant="overline" className="tracking-[0.4px] text-[#f1b6be]">
        YOU’RE OFFLINE
      </AppText>
      <AppText className="mt-3 font-display text-[25px] leading-[30px] text-white">
        Downloads still work.
      </AppText>
      <AppText className="mt-2 text-[13px] leading-4 text-voice-muted">
        Streaming results will return when{"\n"}you reconnect.
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open downloads"
        accessibilityHint="Opens your Library downloads."
        onPress={onOpenDownloads}
        className="mt-4 h-12 flex-row items-center justify-center self-start rounded-full bg-surface px-5 active:opacity-70"
      >
        <AppText className="font-body-bold text-[13px] leading-4 text-voice-canvas">
          Open downloads
        </AppText>
      </Pressable>
    </View>
  );
}
