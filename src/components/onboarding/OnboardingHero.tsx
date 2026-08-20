import { colors } from "@/constants/theme";
import { View } from "@/tw";
import type { OnboardingHeroProps } from "@/types";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

const HILLS_SVG = `<svg width="390" height="278" viewBox="0 0 390 278" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 226C82 184 124 328 222 258C296 206 335 210 390 252L390 0L0 0L0 226Z" fill="#7135C5" fill-opacity="0.24"/></svg>`;

const WAVE_SVG = `<svg width="391" height="55" viewBox="0 0 391 55" fill="none" xmlns="http://www.w3.org/2000/svg"><path opacity="0.5" d="M0.351085 11.3858C96.3541 -24.6154 130.355 98.3885 231.358 34.3865C306.361 -13.615 350.362 -4.61476 390.364 28.3863" stroke="#C49BFF" stroke-width="2.00006"/></svg>`;

export function OnboardingHero({
  children,
  height = 220,
  wash = false,
  showWave = false,
}: OnboardingHeroProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="w-full overflow-visible"
      style={{ height: height + insets.top }}
    >
      <LinearGradient
        colors={[colors.voiceCanvas, colors.voicePanel]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
      {wash ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="absolute inset-0"
          style={{ pointerEvents: "none" }}
        >
          <SvgXml xml={HILLS_SVG} width="100%" height="100%" preserveAspectRatio="none" />
        </View>
      ) : null}
      <View className="flex-1 px-6" style={{ paddingTop: insets.top + 16 }}>
        {children}
      </View>
      {showWave ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="absolute right-0 left-0"
          style={{ bottom: -24, pointerEvents: "none" }}
        >
          <SvgXml xml={WAVE_SVG} width="100%" height={55} preserveAspectRatio="none" />
        </View>
      ) : null}
    </View>
  );
}
