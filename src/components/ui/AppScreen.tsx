import { SafeAreaView, View } from "@/tw";
import type { AppScreenProps } from "@/types";

export function AppScreen({ children, style, ...props }: AppScreenProps) {
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
