import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { motion } from "@/constants/theme";
import { useAppAccessibility } from "@/providers/AccessibilityProvider";
import { View } from "@/tw";
import type { AnimatedLaunchScreenProps } from "@/types";

export function AnimatedLaunchScreen({ onComplete }: AnimatedLaunchScreenProps) {
  const { reduceMotionEnabled } = useAppAccessibility();
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(8));
  const animation = useRef<Animated.CompositeAnimation | undefined>(undefined);
  const completed = useRef(false);

  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const enter = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: reduceMotionEnabled ? motion.reduced : motion.launchEntrance,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: reduceMotionEnabled ? 0 : motion.launchEntrance,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    if (reduceMotionEnabled) {
      animation.current = enter;
    } else {
      animation.current = Animated.sequence([
        enter,
        Animated.delay(motion.launchHold),
        Animated.timing(opacity, {
          toValue: 0,
          duration: motion.launchExit,
          useNativeDriver: true,
        }),
      ]);
    }
    animation.current.start(({ finished }) => {
      if (finished) finish();
    });
    return () => animation.current?.stop();
  }, [finish, opacity, reduceMotionEnabled, translateY]);

  return (
    <View
      accessibilityLabel="Starting Hear!"
      accessibilityRole="progressbar"
      className="flex-1 items-center justify-center bg-voice-canvas px-8"
      onLayout={() => SplashScreen.hide()}
    >
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ opacity, transform: [{ translateY }] }}
        className="items-center"
      >
        <AppText
          variant="title"
          className="font-display text-7xl tracking-[-4px] text-white"
        >
          Hear!
        </AppText>
      </Animated.View>
    </View>
  );
}
