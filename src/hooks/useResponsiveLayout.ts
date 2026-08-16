import { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { layout } from "@/constants/theme";
import type { DeviceClass, ResponsiveLayout } from "@/types";

export function getResponsiveValues(
  width: number,
  height: number,
  fontScale: number,
  insetHeight = 0,
  reduceMotion = false,
): ResponsiveLayout {
  const deviceClass: DeviceClass =
    width <= layout.compactMax
      ? "compact"
      : width <= layout.mediumMax
        ? "medium"
        : "expanded";
  const gutter =
    deviceClass === "compact"
      ? layout.compactGutter
      : deviceClass === "medium"
        ? layout.mediumGutter
        : layout.expandedGutter;
  return {
    width,
    height,
    availableHeight: Math.max(0, height - insetHeight),
    fontScale,
    deviceClass,
    isLandscape: width > height,
    isLargeText: fontScale >= 1.3,
    reduceMotion,
    gutter,
    contentWidth: Math.min(width, layout.contentMax + gutter * 2),
    columns: deviceClass === "compact" ? 2 : deviceClass === "medium" ? 3 : 4,
  };
}

export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);
  return useMemo(
    () =>
      getResponsiveValues(
        width,
        height,
        fontScale,
        insets.top + insets.bottom,
        reduceMotion,
      ),
    [width, height, fontScale, insets.top, insets.bottom, reduceMotion],
  );
}
