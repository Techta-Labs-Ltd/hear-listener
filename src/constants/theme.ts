export const colors = {
  canvas: "#F4F1EC",
  surface: "#FFFFFF",
  text: "#17131C",
  textMuted: "#574F5D",
  primary: "#7135C5",
  primaryStrong: "#52208F",
  primarySoft: "#F0E9FA",
  border: "#DDD3E6",
  success: "#177C57",
  danger: "#B74455",
  voiceCanvas: "#32145D",
  voiceGlow: "#9A68DF",
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const fontFamily = {
  display: "Outfit_600SemiBold",
  displayMedium: "Outfit_500Medium",
  body: "PlusJakartaSans_400Regular",
  bodyMedium: "PlusJakartaSans_500Medium",
  bodySemibold: "PlusJakartaSans_600SemiBold",
  bodyStrong: "PlusJakartaSans_700Bold",
} as const;

export const layout = {
  compactMax: 599,
  mediumMax: 839,
  expandedMin: 840,
  contentMax: 720,
  readingMax: 560,
  touchTarget: 48,
  tabBarHeight: 72,
  compactGutter: 16,
  mediumGutter: 24,
  expandedGutter: 32,
} as const;

export const motion = {
  launchEntrance: 500,
  launchHold: 0,
  launchExit: 150,
  launchWave: 560,
  reduced: 150,
} as const;
