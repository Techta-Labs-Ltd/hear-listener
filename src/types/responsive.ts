export type DeviceClass = "compact" | "medium" | "expanded";
export type ResponsiveLayout = {
  width: number;
  height: number;
  availableHeight: number;
  fontScale: number;
  deviceClass: DeviceClass;
  isLandscape: boolean;
  isLargeText: boolean;
  reduceMotion: boolean;
  gutter: number;
  contentWidth: number;
  columns: number;
};
