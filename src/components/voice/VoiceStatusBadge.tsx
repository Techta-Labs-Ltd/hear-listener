import { useEffect, useState } from "react";
import { Animated } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { View } from "@/tw";
import type { VoiceStatusBadgeProps } from "@/types";
import { cn } from "@/utils/styles";

export function VoiceStatusBadge({ label, className }: VoiceStatusBadgeProps) {
  const [pulseAnim] = useState(() => new Animated.Value(1));

  const isPulsing =
    label.includes("LISTENING") ||
    label.includes("SPEAKING") ||
    label.includes("PREPARING") ||
    label.includes("PROCESSING") ||
    label.includes("ONE MOMENT");

  useEffect(() => {
    if (isPulsing) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.35,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPulsing, pulseAnim]);

  return (
    <View
      accessible={!isPulsing}
      importantForAccessibility={isPulsing ? "no" : "auto"}
      accessibilityRole="text"
      accessibilityLabel={label}
      className={cn("flex-row items-center gap-2.5", className)}
    >
      <Animated.View
        style={{ opacity: pulseAnim }}
        className="h-3 w-3 rounded-full bg-voice-indicator"
      />
      <AppText
        variant="overline"
        className="text-[13px] font-extrabold leading-4 tracking-[0.08em] text-voice-muted uppercase"
      >
        {label}
      </AppText>
    </View>
  );
}
