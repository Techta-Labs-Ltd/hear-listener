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
  const contentWidth = Math.min(width, layout.contentMax + gutter * 2);
  const isCompact = width < 375;
  const isTablet = width >= 600;
  const cardWidth = Math.min(width - gutter * 2, layout.readingMax);

  return {
    width,
    height,
    availableHeight: Math.max(0, height - insetHeight),
    fontScale,
    deviceClass,
    isLandscape: width > height,
    isLargeText: fontScale >= 1.3,
    isCompact,
    isTablet,
    reduceMotion,
    gutter,
    contentWidth,
    cardWidth,
    columns: deviceClass === "compact" ? 2 : deviceClass === "medium" ? 3 : 4,
  };
}
