import { useState } from "react";
import { Platform } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { OptionRow } from "@/components/ui/OptionRow";
import { Pressable, View } from "@/tw";
import { usePlayback } from "@/stores";
import { useRegisterScreenVoice } from "@/hooks/useVoice";
import { routes } from "@/navigation/routes";
import { sleepTimerCopy as copy } from "@/utils/copy/player";
import { safeBack } from "@/utils/navigation";
import type { SleepTimerOptionId } from "@/types";
import { cn } from "@/utils/styles";

const isWeb = Platform.OS === "web";

export function SleepTimerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const playback = usePlayback();
  const [selection, setSelection] = useState<SleepTimerOptionId>("30");

  const pathname = usePathname();
  useRegisterScreenVoice({
    id: "player",
    pathname,
    title: "Sleep Timer",
    orientation:
      "Sleep timer. Choose 15 minutes, 30 minutes, 45 minutes, 60 minutes, or end of story, or dismiss.",
    commands: ["set sleep timer to 30 minutes", "cancel sleep timer", "close"],
    voiceEnabled: true,
  });

  const applyTimer = () => {
    if (selection === "end") {
      const minutes = Math.max(
        1,
        Math.ceil(((1 - playback.progress) * playback.durationSeconds) / 60),
      );
      playback.setSleepTimer(minutes);
    } else {
      playback.setSleepTimer(Number(selection));
    }
    safeBack(router, routes.player);
  };

  return (
    <View className="flex-1 bg-black/20">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.close}
        accessibilityHint="Closes the sleep timer without changing it."
        onPress={() => safeBack(router, routes.player)}
        className="flex-1"
      />
      <View
        className={cn(
          "mx-3 rounded-t-[28px] bg-surface",
          isWeb && "self-center w-[calc(100%_-_24px)] max-w-[696px]",
        )}
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="mx-auto mt-3 h-[5px] w-[68px] rounded-full bg-skeleton"
        />
        <View className="px-8 pt-4">
          <AppText
            accessibilityRole="header"
            className="font-display text-[25px] leading-[30px] text-ink"
          >
            {copy.title}
          </AppText>
          <AppText tone="muted" className="mt-[10px] text-[13px] leading-4">
            {copy.prompt}
          </AppText>
          <View className="mt-[27px] gap-3">
            {copy.options.map((option) => (
              <OptionRow
                key={option.id}
                label={option.label}
                selected={selection === option.id}
                onSelect={() => setSelection(option.id as SleepTimerOptionId)}
              />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.set}
            accessibilityHint="Schedules playback to stop."
            onPress={applyTimer}
            className="mt-7 h-[54px] items-center justify-center rounded-full bg-voice-canvas active:opacity-70"
          >
            <AppText className="font-body-bold text-[15px] leading-[18px] text-white">
              {copy.set}
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
