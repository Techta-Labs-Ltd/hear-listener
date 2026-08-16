import { AppText } from "@/components/ui/AppText";
import { View } from "@/tw";

export function VoicePrompt({ example }: { example: string }) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Double-tap anywhere to speak. Try saying ${example}.`}
      className="border-l-2 border-primary pl-4"
    >
      <AppText variant="overline" tone="primary">DOUBLE-TAP TO SPEAK</AppText>
      <AppText variant="label" tone="muted">Try “{example}”</AppText>
    </View>
  );
}
