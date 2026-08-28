import { Linking, Platform } from "react-native";
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
  const isWeb = Platform.OS === "web";

  return (
    <View className="flex-1 bg-canvas">
      <View className="w-full max-w-[560px] flex-1 self-center">
        {onBack ? <ScreenHeader title="" onBack={onBack} /> : null}
        <View className="flex-1 items-center justify-center px-6 pb-12">
          {/* Centered Pink Circle with Red X */}
          <View className="h-28 w-28 items-center justify-center rounded-full bg-[#FFF0EE]">
            <AppText className="text-[38px] font-bold text-[#A64E55]">✕</AppText>
          </View>

          {/* Title */}
          <AppText
            accessibilityRole="header"
            className="mt-8 text-center font-display text-[32px] sm:text-[36px] font-bold leading-[38px] sm:leading-[42px] text-ink"
          >
            Voice access is off
          </AppText>

          {/* Subtitle */}
          <AppText tone="muted" className="mt-3 text-center text-[16px] leading-[23px] max-w-[320px]">
            {isWeb
              ? "Allow microphone access in your browser address bar to use shake voice control."
              : "Allow microphone access in Settings to use shake voice control."}
          </AppText>

          {/* Action Buttons */}
          <View className="mt-9 w-full gap-3.5">
            {!isWeb && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open Settings"
                accessibilityHint="Opens system settings to allow microphone permission."
                onPress={() => void Linking.openSettings()}
                className="h-14 w-full items-center justify-center rounded-full bg-[#21102F] active:opacity-85 shadow-sm"
              >
                <AppText className="font-body-bold text-[16px] text-white">
                  Open Settings
                </AppText>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue without voice"
              accessibilityHint="Continues using touch controls only."
              onPress={onContinueWithoutVoice ?? onBack}
              className="h-14 w-full items-center justify-center rounded-full border border-border bg-white active:opacity-85 shadow-sm"
            >
              <AppText className="font-body-bold text-[16px] text-[#21102F]">
                Continue without voice
              </AppText>
            </Pressable>
          </View>

          {/* Footer Note */}
          <AppText tone="muted" className="mt-8 text-center text-[13px] leading-4">
            All touch controls remain available.
          </AppText>
        </View>
      </View>
    </View>
  );
}
