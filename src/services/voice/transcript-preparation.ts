import { SAFE_FILLER_PHRASES } from "./recognition-dictionary";
import { normalizeForMatch } from "./profanity-filter";
import type { TranscriptPreparationResult } from "@/types";

const FILLER_BY_LENGTH = [...SAFE_FILLER_PHRASES]
  .map((phrase) => ({
    phrase,
    normalized: normalizeForMatch(phrase),
  }))
  .sort((left, right) => right.normalized.length - left.normalized.length);

type Token = {
  raw: string;
  normalized: string;
};

function tokenize(value: string): Token[] {
  return value
    .split(/\s+/)
    .filter((raw) => raw.length > 0)
    .map((raw) => ({ raw, normalized: normalizeForMatch(raw) }));
}

export function stripSafeFillers(
  text: string,
  protectedPhrases: string[] = [],
): TranscriptPreparationResult {
  const tokens = tokenize(text);
  const protectedIndices = protectedTokenIndices(tokens, protectedPhrases);
  const removed = new Set<number>();

  for (const filler of FILLER_BY_LENGTH) {
    const fillerTokens = filler.normalized.split(" ").filter(Boolean);
    for (
      let start = 0;
      start + fillerTokens.length <= tokens.length;
      start += 1
    ) {
      const matches = fillerTokens.every(
        (part, offset) => tokens[start + offset].normalized === part,
      );
      if (!matches) continue;
      const overlapsProtected = fillerTokens.some(
        (_, offset) => protectedIndices.has(start + offset),
      );
      const alreadyRemoved = fillerTokens.some((_, offset) =>
        removed.has(start + offset),
      );
      if (overlapsProtected || alreadyRemoved) continue;
      for (let offset = 0; offset < fillerTokens.length; offset += 1) {
        removed.add(start + offset);
      }
    }
  }

  const parts: string[] = [];
  tokens.forEach((token, index) => {
    if (!removed.has(index)) parts.push(token.raw);
  });
  const joined = parts.join(" ").replace(/\s{2,}/g, " ").trim();
  const sanitized = joined.length ? joined : text;

  return {
    original: text,
    sanitized,
    removedFillerCount: removed.size,
  };
}

function protectedTokenIndices(
  tokens: Token[],
  protectedPhrases: string[],
): Set<number> {
  const indices = new Set<number>();
  for (const phrase of protectedPhrases) {
    const phraseTokens = normalizeForMatch(phrase).split(" ").filter(Boolean);
    if (!phraseTokens.length) continue;
    for (
      let start = 0;
      start + phraseTokens.length <= tokens.length;
      start += 1
    ) {
      const matches = phraseTokens.every(
        (part, offset) => tokens[start + offset].normalized === part,
      );
      if (!matches) continue;
      for (let offset = 0; offset < phraseTokens.length; offset += 1) {
        indices.add(start + offset);
      }
    }
  }
  return indices;
}
