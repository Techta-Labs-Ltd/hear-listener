import type { ResponsiveLayout } from "@/types";
import { getResponsiveValues } from "@/utils/responsive";
import { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
