export type DeviceClass = "compact" | "medium" | "expanded";
export type ResponsiveLayout = {
  width: number;
  height: number;
  availableHeight: number;
  fontScale: number;
  deviceClass: DeviceClass;
  isLandscape: boolean;
  isLargeText: boolean;
  isCompact: boolean;
  isTablet: boolean;
  reduceMotion: boolean;
  gutter: number;
  contentWidth: number;
  cardWidth: number;
  columns: number;
};
