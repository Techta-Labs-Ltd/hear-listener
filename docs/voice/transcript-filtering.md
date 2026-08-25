# Transcript Filtering

## Order

```text
ASR alternatives
      |
      v
native Android mask (API 33+, where supported)
      |
      v
shared profanity sanitizer
      |
      v
safe filler removal
      |
      v
local command detection
      |
      v
semantic grammar parsing
      |
      v
SQLite entity resolver
```

Filtering happens **before** command routing, semantic resolution, feedback
processing, and diagnostic persistence.

## Profanity filtering

- `src/services/voice/profanity-filter.ts` — shared Android + iOS sanitizer.
- Dictionary: `src/services/voice/dictionaries/profanity-en-GB.ts` (British
  spellings, contractions, ASR spacing variants, inflections).
- Whole-token/phrase matching only; never substring replacement.
- Modes: `remove` (command pipeline) and `mask`.
- Entity safety: tokens inside protected phrases (SQLite/contextual strings)
  are preserved. `protectedPhrases` come from SQLite, never hardcoded catalog
  names.
- Partial transcripts shown in the UI are sanitized before display; every ASR
  alternative is sanitized independently.
- Production telemetry never persists unsanitized raw transcripts.

Android also passes `EXTRA_MASK_OFFENSIVE_WORDS: true` on API 33+ as layer 1,
but the shared sanitizer remains the source of truth because native masking
is advisory and iOS has no equivalent.

## Filler removal

`stripSafeFillers` in `src/services/voice/transcript-preparation.ts` removes
conversational noise (`um`, `please`, `can you`, ...) on token/phrase
boundaries, never inside protected entity spans, preserving spacing.

## Rules that protect entities

- Never globally delete words such as `talking`, `magazine`, `newspaper`,
  `news`, `publication` — they may be part of real names.
- Common catalog tokens are down-weighted via DB-derived token rarity
  (`voice_token_rarity`), not deleted.

## Official references

- [Android EXTRA_MASK_OFFENSIVE_WORDS](https://developer.android.com/reference/android/speech/RecognizerIntent#EXTRA_MASK_OFFENSIVE_WORDS)
