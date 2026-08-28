import { voiceTokens } from "../normalize";

export function buildFtsMatch(text: string): string | null {
  const tokens = voiceTokens(text).filter(
    (token) => token.length > 1,
  );
  if (!tokens.length) return null;
  return tokens
    .map((token) => `"${token.replaceAll('"', '""')}"*`)
    .join(" OR ");
}
