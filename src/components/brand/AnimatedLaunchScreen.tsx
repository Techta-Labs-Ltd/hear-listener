import { AppText } from "@/components/ui/AppText";
import { colors, motion } from "@/constants/theme";
import { useAppAccessibility } from "@/providers/AccessibilityProvider";
import { View } from "@/tw";
import type { AnimatedLaunchScreenProps } from "@/types";
import { LinearGradient } from "expo-linear-gradient";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions } from "react-native";
import { SvgXml } from "react-native-svg";

const WAVE_DIM_SVG = `<svg width="513" height="72" viewBox="0 0 513 72" fill="none" xmlns="http://www.w3.org/2000/svg"><path opacity="0.12" d="M0.361458 70.5795C130.452 -27.4889 238.528 145.632 512.719 0.530644" stroke="#B58BE9" stroke-width="1.20084"/></svg>`;
const WAVE_BRIGHT_SVG = `<svg width="513" height="72" viewBox="0 0 513 72" fill="none" xmlns="http://www.w3.org/2000/svg"><path opacity="0.48" d="M0.421593 70.6533C130.485 -27.3948 238.538 145.69 512.672 0.618955" stroke="#C6A6F2" stroke-width="1.40069"/></svg>`;
const WAVE_ASPECT = 72 / 513;
const useNativeDriver = Platform.OS !== "web";

export function AnimatedLaunchScreen({ onComplete }: AnimatedLaunchScreenProps) {
  const { reduceMotionEnabled } = useAppAccessibility();
  const { width, height } = useWindowDimensions();
  const [reveal] = useState(() => new Animated.Value(0));
  const [brand] = useState(() => new Animated.Value(0));
  const [exitOpacity] = useState(() => new Animated.Value(1));
  const animation = useRef<Animated.CompositeAnimation | undefined>(undefined);
  const completed = useRef(false);

  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const completionFallback = setTimeout(
      finish,
      reduceMotionEnabled
        ? motion.launchHold + motion.reduced + 100
        : motion.launchEntrance + motion.launchBrand + motion.launchHold + motion.launchExit + 150,
    );
    if (reduceMotionEnabled) {
      reveal.setValue(1);
      brand.setValue(1);
      animation.current = Animated.sequence([
        Animated.delay(motion.launchHold),
        Animated.timing(exitOpacity, {
          toValue: 0,
          duration: motion.reduced,
          useNativeDriver,
        }),
      ]);
    } else {
      animation.current = Animated.sequence([
        Animated.timing(reveal, {
          toValue: 1,
          duration: motion.launchEntrance,
          easing: Easing.out(Easing.cubic),
          useNativeDriver,
        }),
        Animated.timing(brand, {
          toValue: 1,
          duration: motion.launchBrand,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver,
        }),
        Animated.delay(motion.launchHold),
        Animated.timing(exitOpacity, {
          toValue: 0,
          duration: motion.launchExit,
          useNativeDriver,
        }),
      ]);
    }
    animation.current.start(({ finished }) => {
      if (finished) finish();
    });
    return () => {
      clearTimeout(completionFallback);
      animation.current?.stop();
    };
  }, [finish, reveal, brand, exitOpacity, reduceMotionEnabled]);

  const waveWidth = width + 124;
  const waveHeight = waveWidth * WAVE_ASPECT;
  const waveTop = height * (100 / 844);
  const wordmarkLift = height * (46 / 844);
  const wordOpacity = Animated.multiply(reveal, exitOpacity);
  const wordTranslateY = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  return (
    <View
      accessibilityLabel="Starting Hear!"
      accessibilityRole="progressbar"
      className="flex-1"
      style={{ backgroundColor: colors.brandNight }}
      onLayout={() => SplashScreen.hide()}
    >
      <StatusBar style="light" />
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: "absolute",
          left: -62,
          top: waveTop,
          width: waveWidth,
          height: waveHeight,
          pointerEvents: "none",
        }}
      >
        <SvgXml xml={WAVE_DIM_SVG} width={waveWidth} height={waveHeight} />
      </View>
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          StyleSheet.absoluteFill,
          { opacity: brand, pointerEvents: "none" as const },
        ]}
      >
        <LinearGradient
          colors={[colors.brandDusk, colors.brandViolet, colors.brandPlum]}
          locations={[0, 0.65, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={{
            position: "absolute",
            left: -110,
            top: -54,
            width: 380,
            height: 380,
            borderRadius: 190,
            backgroundColor: colors.brandGlow,
            opacity: 0.13,
          }}
        />
        <View
          style={{
            position: "absolute",
            left: -62,
            top: waveTop,
            width: waveWidth,
            height: waveHeight,
          }}
        >
          <SvgXml xml={WAVE_BRIGHT_SVG} width={waveWidth} height={waveHeight} />
        </View>
      </Animated.View>
      <View
        className="flex-1 items-center justify-center"
        style={{ paddingBottom: wordmarkLift }}
      >
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            opacity: wordOpacity,
            transform: [{ translateY: wordTranslateY }],
            alignItems: "center",
          }}
        >
          <AppText className="font-display text-[70px] leading-[84px] text-white">
            Hear!
          </AppText>
          <Animated.View
            style={{
              marginTop: 12,
              height: 2,
              width: 116,
              backgroundColor: colors.voiceIndicator,
              transform: [{ scaleX: brand }],
            }}
          />
        </Animated.View>
      </View>
    </View>
  );
}
