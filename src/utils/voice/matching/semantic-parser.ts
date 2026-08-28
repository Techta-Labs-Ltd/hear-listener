import type {
  EntityRelation,
  EntityType,
  ParsedUtterance,
  RelationSpan,
  SemanticAction,
  SemanticModifiers,
  TextSpan,
} from "@/types";
import { normalizeVoiceText, voiceTokens } from "../normalize";
import { generateQueryWindows } from "./query-spans";

const PLAY_STARTERS = [
  "play",
  "play me",
  "put on",
  "start playing",
  "start",
  "listen to",
];
const FIND_STARTERS = [
  "find",
  "find me",
  "search for",
  "look for",
  "give me",
  "show me",
  "let me hear",
  "i want to hear",
  "i would like to hear",
  "i want",
  "i would like",
  "get me",
];

const SEMANTIC_FILLERS = new Set([
  "the",
  "a",
  "an",
  "some",
  "something",
  "me",
  "please",
  "now",
  "any",
  "my",
  "of",
]);

const CONTENT_NOUNS = new Set([
  "audio",
  "content",
  "episode",
  "episodes",
  "publication",
  "publications",
  "recording",
  "recordings",
  "story",
  "stories",
  "track",
  "tracks",
  "podcast",
  "podcasts",
  "article",
  "articles",
  "edition",
  "editions",
  "magazine",
  "magazines",
  "news",
]);

const RELATION_TYPES: Record<EntityRelation, EntityType[]> = {
  from: ["organization", "publication", "location"],
  by: ["creator"],
  in: ["location"],
  about: ["category", "tag"],
};

const RELATION_MARKERS: Record<string, EntityRelation> = {
  from: "from",
  by: "by",
  in: "in",
  about: "about",
  on: "about",
};

type ModifierSpec = { phrase: string; apply: (m: SemanticModifiers) => void };

const MODIFIER_SPECS: ModifierSpec[] = [
  { phrase: "most recent", apply: (m) => (m.latest = true) },
  { phrase: "the latest", apply: (m) => (m.latest = true) },
  { phrase: "latest", apply: (m) => (m.latest = true) },
  { phrase: "newest", apply: (m) => (m.latest = true) },
  { phrase: "recent", apply: (m) => (m.latest = true) },
  { phrase: "my local news", apply: (m) => (m.local = true) },
  { phrase: "local news", apply: (m) => (m.local = true) },
  { phrase: "my local", apply: (m) => (m.local = true) },
  { phrase: "local", apply: (m) => (m.local = true) },
  { phrase: "near me", apply: (m) => (m.local = true) },
  { phrase: "nearby", apply: (m) => (m.local = true) },
  { phrase: "my area", apply: (m) => (m.local = true) },
  { phrase: "my town", apply: (m) => (m.local = true) },
  { phrase: "my city", apply: (m) => (m.local = true) },
  { phrase: "my community", apply: (m) => (m.local = true) },
  { phrase: "around here", apply: (m) => (m.local = true) },
  { phrase: "recommendations", apply: (m) => (m.recommended = true) },
  { phrase: "recommendation", apply: (m) => (m.recommended = true) },
  { phrase: "recommended", apply: (m) => (m.recommended = true) },
  { phrase: "for me", apply: (m) => (m.recommended = true) },
  {
    phrase: "something i might like",
    apply: (m) => (m.recommended = true),
  },
  {
    phrase: "based on what i listen to",
    apply: (m) => (m.recommended = true),
  },
  { phrase: "what is trending", apply: (m) => (m.trending = true) },
  { phrase: "whats trending", apply: (m) => (m.trending = true) },
  { phrase: "trending", apply: (m) => (m.trending = true) },
  { phrase: "my saved audio", apply: (m) => (m.saved = true) },
  { phrase: "saved audio", apply: (m) => (m.saved = true) },
  { phrase: "my saved", apply: (m) => (m.saved = true) },
  { phrase: "my downloads", apply: (m) => (m.downloads = true) },
  { phrase: "downloads", apply: (m) => (m.downloads = true) },
  { phrase: "publications", apply: (m) => (m.publication = true) },
  { phrase: "publication", apply: (m) => (m.publication = true) },
];

export function emptyModifiers(): SemanticModifiers {
  return {
    latest: false,
    local: false,
    recommended: false,
    trending: false,
    saved: false,
    downloads: false,
    publication: false,
  };
}

function matchStarter(tokens: string[], phrase: string): number | null {
  const phraseTokens = voiceTokens(phrase);
  if (phraseTokens.length > tokens.length) return null;
  const candidate = tokens.slice(0, phraseTokens.length).join(" ");
  return candidate === phraseTokens.join(" ") ? phraseTokens.length : null;
}

function detectAction(tokens: string[]): {
  action: SemanticAction;
  consumed: number;
} {
  const joined = tokens.join(" ");
  if (joined.startsWith("recommend") || joined.startsWith("recommendations")) {
    return { action: "play", consumed: 1 };
  }
  if (joined.startsWith("what should i listen to")) {
    return { action: "play", consumed: 5 };
  }
  for (const starter of PLAY_STARTERS) {
    const count = matchStarter(tokens, starter);
    if (count !== null) return { action: "play", consumed: count };
  }
  for (const starter of FIND_STARTERS) {
    const count = matchStarter(tokens, starter);
    if (count !== null) return { action: "find", consumed: count };
  }
  if (matchStarter(tokens, "follow")) return { action: "follow", consumed: 1 };
  if (matchStarter(tokens, "unfollow"))
    return { action: "unfollow", consumed: 1 };
  return { action: "none", consumed: 0 };
}

export function parseUtterance(raw: string): ParsedUtterance {
  const normalized = normalizeVoiceText(raw);
  const tokens = voiceTokens(normalized);
  const consumed = new Set<number>();
  const modifiers = emptyModifiers();

  let actionResult = detectAction(tokens);
  for (let index = 0; index < actionResult.consumed; index += 1) {
    consumed.add(index);
  }

  const recommendedContext =
    actionResult.action === "play" &&
    normalized.startsWith("recommend");
  if (recommendedContext) modifiers.recommended = true;

  const trendingContext =
    /^(what is trending|whats trending|show me what is trending|show me whats trending)/.test(
      normalized,
    );
  if (trendingContext) {
    actionResult = { action: "play", consumed: actionResult.consumed };
    modifiers.trending = true;
    const consumedPhrase = normalized.match(
      /^(show me what is trending|show me whats trending|what is trending|whats trending)/,
    )?.[0];
    if (consumedPhrase) {
      const count = consumedPhrase.split(" ").length;
      for (let index = 0; index < count; index += 1) consumed.add(index);
    }
  }

  const sortedModifiers = [...MODIFIER_SPECS].sort(
    (left, right) => right.phrase.length - left.phrase.length,
  );
  for (const spec of sortedModifiers) {
    const phraseTokens = voiceTokens(spec.phrase);
    for (let start = 0; start + phraseTokens.length <= tokens.length; start++) {
      if (phraseTokens.some((_, offset) => consumed.has(start + offset)))
        continue;
      const matches = phraseTokens.every(
        (token, offset) => tokens[start + offset] === token,
      );
      if (!matches) continue;
      if (spec.phrase === "publication" || spec.phrase === "publications") {
        const hasModifierContext =
          modifiers.latest ||
          modifiers.recommended ||
          modifiers.local ||
          modifiers.trending;
        const next = tokens[start + phraseTokens.length];
        const followedByRelation = next ? next in RELATION_MARKERS : false;
        const remaining =
          tokens.length -
          actionResult.consumed -
          phraseTokens.length -
          consumed.size;
        if (!hasModifierContext && !followedByRelation && remaining < 2)
          continue;
      }
      spec.apply(modifiers);
      for (let offset = 0; offset < phraseTokens.length; offset += 1) {
        consumed.add(start + offset);
      }
      break;
    }
  }

  for (let index = actionResult.consumed; index < tokens.length; index += 1) {
    if (!consumed.has(index) && SEMANTIC_FILLERS.has(tokens[index])) {
      consumed.add(index);
    }
  }

  for (let index = 0; index < tokens.length; index += 1) {
    if (consumed.has(index)) continue;
    if (!CONTENT_NOUNS.has(tokens[index])) continue;
    const hasModifierContext =
      modifiers.latest ||
      modifiers.recommended ||
      modifiers.local ||
      modifiers.trending;
    const next = tokens[index + 1];
    const followedByRelation = next ? next in RELATION_MARKERS : false;
    if (hasModifierContext || followedByRelation) {
      consumed.add(index);
      if (tokens[index] === "news") modifiers.local = true;
    }
  }

  if (tokens.join(" ") === "play news" || tokens.join(" ") === "play the news") {
    modifiers.local = true;
    for (let index = 0; index < tokens.length; index += 1) consumed.add(index);
  }

  const relations: RelationSpan[] = [];
  let active: { relation: EntityRelation; start: number } | undefined;
  for (let index = actionResult.consumed; index <= tokens.length; index += 1) {
    const marker = index < tokens.length ? RELATION_MARKERS[tokens[index]] : undefined;
    if (marker || index === tokens.length) {
      if (active) {
        let start = active.start;
        while (start < index && SEMANTIC_FILLERS.has(tokens[start])) start += 1;
        if (start < index) {
          relations.push({
            relation: active.relation,
            span: {
              start,
              end: index,
              text: tokens.slice(start, index).join(" "),
            },
            expectedTypes: RELATION_TYPES[active.relation],
          });
          for (let offset = start; offset < index; offset += 1)
            consumed.add(offset);
        }
        active = undefined;
      }
      if (marker) {
        active = { relation: marker, start: index + 1 };
        consumed.add(index);
      }
    }
  }

  const residualTokens = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ index }) => !consumed.has(index))
    .map(({ token }) => token);

  const contentWindows: TextSpan[] = [];
  if (relations.length) {
    for (const relation of relations) {
      contentWindows.push(relation.span);
      contentWindows.push(
        ...generateQueryWindows(
          voiceTokens(relation.span.text),
          6,
        ).map((span) => ({
          start: relation.span.start + span.start,
          end: relation.span.start + span.end,
          text: span.text,
        })),
      );
    }
  } else if (residualTokens.length) {
    contentWindows.push(...generateQueryWindows(residualTokens, 12));
  }

  return {
    raw,
    normalized,
    tokens,
    action: actionResult.action,
    modifiers,
    relations,
    contentWindows,
    residual: residualTokens.join(" "),
  };
}

export function parseEntityRelation(value: string): EntityRelation | undefined {
  return RELATION_MARKERS[value];
}
