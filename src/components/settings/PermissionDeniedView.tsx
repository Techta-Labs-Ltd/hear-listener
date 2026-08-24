import { Linking } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Pressable, View } from "@/tw";

export function PermissionDeniedView({
  onBack,
  onContinueWithoutVoice,
}: {
  onBack?: () => void;
  onContinueWithoutVoice?: () => void;
}) {
  return (
    <View className="flex-1 bg-canvas">
      <View className="w-full max-w-[720px] flex-1 self-center">
        {onBack ? <ScreenHeader title="" onBack={onBack} /> : null}
        <View className="flex-1 items-center justify-center px-6 pb-12">
          <View className="h-28 w-28 items-center justify-center rounded-full bg-[#FFF0EE]">
            <AppText className="text-[36px] font-bold text-[#A64E55]">✕</AppText>
          </View>

          <AppText
            accessibilityRole="header"
            className="mt-8 text-center font-display text-[30px] leading-[36px] text-ink"
          >
            Voice access is off
          </AppText>
          <AppText tone="muted" className="mt-3 text-center text-sm leading-5">
            Allow microphone access in Settings{"\n"}to use voice control.
          </AppText>

          <View className="mt-9 w-full gap-3.5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Settings"
              accessibilityHint="Opens system settings to allow microphone permission."
              onPress={() => void Linking.openSettings()}
              className="h-14 w-full items-center justify-center rounded-[20px] bg-voice-canvas active:opacity-85"
            >
              <AppText className="font-body-bold text-base leading-5 text-white">
                Open Settings
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue without voice"
              accessibilityHint="Continues using touch controls only."
              onPress={onContinueWithoutVoice ?? onBack}
              className="h-14 w-full items-center justify-center rounded-[20px] border border-border bg-surface active:opacity-80"
            >
              <AppText className="font-body-bold text-base leading-5 text-voice-canvas">
                Continue without voice
              </AppText>
            </Pressable>
          </View>

          <AppText tone="muted" className="mt-8 text-center text-xs leading-4">
            All touch controls remain available.
          </AppText>
        </View>
      </View>
    </View>
  );
}
