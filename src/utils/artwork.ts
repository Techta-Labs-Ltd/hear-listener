import { artworkGradients } from "@/constants/theme";

export function getArtworkGradient(index: number): readonly [string, string] {
  const safeIndex = Math.max(0, Math.floor(index));
  return artworkGradients[safeIndex % artworkGradients.length];
}

export const artworkGradient = getArtworkGradient;
