import { PROFANITY_EN_GB } from "@/constants/profanity-en-gb";
import type {
  ProfanityFilter,
  ProfanityFilterMode,
  ProfanityFilterResult,
} from "@/types";

const MASK = "****";

type NormalizedToken = {
  raw: string;
  normalized: string;
};

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export { normalizeForMatch };

function tokenize(value: string): NormalizedToken[] {
  return value
    .split(/\s+/)
    .filter((raw) => raw.length > 0)
    .map((raw) => ({ raw, normalized: normalizeForMatch(raw) }));
}

const PROFANITY_PHRASES = [...PROFANITY_EN_GB]
  .flatMap((entry) =>
    entry.variants.map((variant) => ({
      normalized: normalizeForMatch(variant),
      term: entry.canonical,
    })),
  )
  .filter((item) => item.normalized.length > 0)
  .sort((left, right) => right.normalized.length - left.normalized.length);

export class WholeWordProfanityFilter implements ProfanityFilter {
  constructor(
    private readonly protectedPhrases: string[] = [],
  ) {}

  sanitize(
    text: string,
    mode: ProfanityFilterMode = "remove",
  ): ProfanityFilterResult {
    const tokens = tokenize(text);
    const protectedIndices = this.protectedTokenIndices(tokens);
    const maskedIndices = new Set<number>();
    const removedIndices = new Set<number>();
    const matchedTerms = new Set<string>();

    for (const phrase of PROFANITY_PHRASES) {
      const phraseTokens = phrase.normalized.split(" ").filter(Boolean);
      for (
        let start = 0;
        start + phraseTokens.length <= tokens.length;
        start += 1
      ) {
        const matches = phraseTokens.every(
          (part, offset) => tokens[start + offset].normalized === part,
        );
        if (!matches) continue;
        const overlapsProtected = phraseTokens.some(
          (_, offset) => protectedIndices.has(start + offset),
        );
        const alreadyHandled = phraseTokens.some(
          (_, offset) =>
            removedIndices.has(start + offset) ||
            maskedIndices.has(start + offset),
        );
        if (overlapsProtected || alreadyHandled) continue;
        for (let offset = 0; offset < phraseTokens.length; offset += 1) {
          const index = start + offset;
          if (offset === 0 && mode === "mask") {
            maskedIndices.add(index);
          } else {
            removedIndices.add(index);
          }
        }
        matchedTerms.add(phrase.term);
      }
    }

    const parts: string[] = [];
    tokens.forEach((token, index) => {
      if (maskedIndices.has(index)) {
        parts.push(MASK);
      } else if (!removedIndices.has(index)) {
        parts.push(token.raw);
      }
    });

    return {
      original: text,
      sanitized: parts.join(" ").replace(/\s{2,}/g, " ").trim(),
      removedCount: matchedTerms.size,
      matchedTerms: [...matchedTerms],
    };
  }

  private protectedTokenIndices(tokens: NormalizedToken[]): Set<number> {
    const indices = new Set<number>();
    for (const phrase of this.protectedPhrases) {
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
}

export const defaultProfanityFilter: ProfanityFilter =
  new WholeWordProfanityFilter();
