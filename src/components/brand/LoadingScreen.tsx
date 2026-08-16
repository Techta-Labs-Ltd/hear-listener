import { AppText } from "@/components/ui/AppText";
import { View } from "@/tw";
import { HearLogo } from "./HearLogo";

export function LoadingScreen() {
  return (
    <View
      accessibilityLabel="Loading Hear!"
      accessibilityRole="progressbar"
      className="flex-1 items-center justify-center gap-6 bg-canvas"
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <HearLogo size={88} />
      </View>
      <AppText tone="muted" variant="label">
        Getting Hear! ready for you
      </AppText>
    </View>
  );
}
