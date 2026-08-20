import { useEffect, useState } from "react";
import { Animated, Platform } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { ukSpeech } from "@/services/voice/speech";
import { View } from "@/tw";
import { HearLogo } from "./HearLogo";

const FULL_TEXT = "Getting Hear! ready for you";
const useNativeDriver = Platform.OS !== "web";

export function LoadingScreen() {
  const [displayedText, setDisplayedText] = useState("");
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [cursorAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    void ukSpeech.speak("Getting Hear ready for you.");
  }, []);

  useEffect(() => {
    let index = 0;
    setDisplayedText("");
    const interval = setInterval(() => {
      index += 1;
      setDisplayedText(FULL_TEXT.slice(0, index));
      if (index >= FULL_TEXT.length) {
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorAnim, {
          toValue: 0,
          duration: 450,
          useNativeDriver,
        }),
        Animated.timing(cursorAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [cursorAnim]);

  return (
    <View
      accessible
      accessibilityLabel={FULL_TEXT}
      accessibilityRole="progressbar"
      accessibilityLiveRegion="polite"
      className="flex-1 items-center justify-center gap-7 bg-canvas px-6"
    >
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ transform: [{ scale: pulseAnim }] }}
      >
        <HearLogo size={96} />
      </Animated.View>

      <View className="flex-row items-center justify-center">
        <AppText
          className="font-display text-[22px] sm:text-[26px] leading-[28px] sm:leading-[32px] text-ink text-center"
        >
          {displayedText}
        </AppText>
        <Animated.View
          style={{ opacity: cursorAnim }}
          className="ml-1 h-6 w-[3px] rounded-full bg-primary"
        />
      </View>
    </View>
  );
}
