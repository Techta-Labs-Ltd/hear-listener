import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { soundWave } from "@/constants/theme";
import { View } from "@/tw";
import type { SoundWaveBarsProps } from "@/types";
import { cn } from "@/utils/styles";

export function SoundWaveBars({
  playing = true,
  barCount = 3,
  size = "sm",
  colors = soundWave.defaultColors,
  className,
}: SoundWaveBarsProps) {
  const count = Math.max(2, Math.min(barCount, 5));
  const cfg = soundWave.sizes[size] ?? soundWave.sizes.sm;

  const animsRef = useRef<Animated.Value[]>([]);
  if (animsRef.current.length !== count) {
    animsRef.current = Array.from(
      { length: count },
      (_, i) =>
        new Animated.Value(
          soundWave.initialHeights[i % soundWave.initialHeights.length],
        ),
    );
  }

  useEffect(() => {
    if (!playing) {
      animsRef.current.forEach((anim, i) => {
        anim.setValue(
          soundWave.initialHeights[i % soundWave.initialHeights.length] * 0.5,
        );
      });
      return;
    }

    const animations = animsRef.current.map((anim, i) => {
      const dur = soundWave.durations[i % soundWave.durations.length];
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: dur,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0.2,
            duration: dur,
            useNativeDriver: false,
          }),
        ]),
      );
    });

    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [playing, count]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn(
        "flex-row items-end",
        cfg.containerHeight,
        cfg.gap,
        className,
      )}
    >
      {animsRef.current.map((anim, i) => {
        const barColor = colors[i % colors.length] ?? soundWave.defaultColors[0];
        return (
          <Animated.View
            key={i}
            className="rounded-full"
            style={{
              width: cfg.width,
              backgroundColor: barColor,
              height: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [cfg.minHeight, cfg.maxHeight],
              }),
            }}
          />
        );
      })}
    </View>
  );
}
