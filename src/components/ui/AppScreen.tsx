import { SafeAreaView, View } from "@/tw";
import type { AppScreenProps } from "@/types";
import { useRegisterScreenVoice } from "@/hooks/useVoice";

export function AppScreen({
  children,
  style,
  screenTitle,
  screenOrientation,
  screenReadout,
  voiceCommands,
  ...props
}: AppScreenProps) {
  useRegisterScreenVoice({
    title: screenTitle,
    orientation: screenOrientation,
    readout: screenReadout,
    commands: voiceCommands,
  });

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <View
        className="w-full max-w-[720px] flex-1 self-center"
        style={style}
        {...props}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
