import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { SafeAreaView, View } from "@/tw";
import type { AppScreenProps } from "@/types";

export function AppScreen({ children, style, ...props }: AppScreenProps) {
  const responsive = useResponsiveLayout();
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <View
        className="flex-1 self-center"
        style={[{ width: responsive.contentWidth }, style]}
        {...props}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
