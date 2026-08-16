import { Image } from "react-native";
import { appAssets } from "@/constants/assets";
import type { HearLogoProps } from "@/types";

export type { HearLogoProps };

export function HearLogo({
  size = 40,
  width,
  height,
  style,
}: HearLogoProps) {
  const w = width ?? size;
  const h = height ?? size;

  return (
    <Image
      accessibilityRole="image"
      accessibilityLabel="Hear! Logo"
      resizeMode="contain"
      source={appAssets.images.logo}
      style={[{ width: w, height: h }, style]}
    />
  );
}

