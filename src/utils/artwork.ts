import { artworkGradients } from "@/constants/theme";

export function getArtworkGradient(index: number): readonly [string, string] {
  const safeIndex = Math.max(0, Math.floor(index));
  return artworkGradients[safeIndex % artworkGradients.length];
}

export const artworkGradient = getArtworkGradient;

export function artworkIndexForId(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return hash;
}
