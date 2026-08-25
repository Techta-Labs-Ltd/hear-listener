import { voiceTokens } from "../normalize";

export function buildFtsMatch(normalizedText: string): string | null {
  const tokens = voiceTokens(normalizedText).filter(
    (token) => token.length > 1,
  );
  if (!tokens.length) return null;
  return tokens
    .map((token) => `"${token.replaceAll('"', '""')}"*`)
    .join(" OR ");
}
