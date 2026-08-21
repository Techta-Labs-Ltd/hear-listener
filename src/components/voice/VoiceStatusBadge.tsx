import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { View } from "@/tw";
import type { VoiceStatusBadgeProps } from "@/types";
import { cn } from "@/utils/styles";

export function VoiceStatusBadge({ label, className }: VoiceStatusBadgeProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (label.includes("LISTENING") || label.includes("SPEAKING")) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [label, pulseAnim]);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      className={cn("flex-row items-center gap-3", className)}
    >
      <Animated.View
        style={{ opacity: pulseAnim }}
        className="h-2.5 w-2.5 rounded-full bg-voice-indicator"
      />
      <AppText
        variant="overline"
        className="text-[13px] leading-4 tracking-[0.4px] text-voice-muted"
      >
        {label}
      </AppText>
    </View>
  );
}
