# Dictionary and Contextual Strings

## Four layers

```text
Layer 1: generic app commands        (code/config — describes app behavior)
Layer 2: safe filler phrases          (code/config — conversational noise)
Layer 3: semantic command grammar    (code/config — generic content language)
Layer 4: SQLite entity vocabulary    (data — what exists)
```

## Layer 1 — local command dictionary

`LOCAL_COMMAND_DICTIONARY` in
`src/services/voice/recognition-dictionary.ts` maps canonical action IDs to
phrase lists. `local-command-router.ts` consumes it; synonyms map to existing
canonical actions, never new duplicate actions. It contains zero catalog
names.

## Layer 2 — safe filler phrases

`SAFE_FILLER_PHRASES` (same file). Removal is token/phrase-boundary aware and
never applies inside protected entity phrases. If uncertain, preserve.

## Layer 3 — semantic grammar

Play/find starters, modifiers (latest/local/recommended/publication), and
relations (from/by/in/about) are parsed structurally by
`matching/semantic-parser.ts` — never deleted blindly.

## Layer 4 — SQLite entity vocabulary

`voice_entities` + `voice_aliases` supply organization, publication, creator,
category, tag, location, and story vocabulary, including `validated-asr`
aliases. See [sqlite-resolver.md](./sqlite-resolver.md).

## Contextual strings (recognition bias)

`repository.getRecognitionBiasTerms()` selects 20-50 relevant terms for
`contextualStrings` on both platforms, scored by:

```text
active entity         +100
ambiguity candidate    +95
current publication    +90
current organization   +85
current creator        +80
visible screen result  +70
recently played        +55
recently searched      +45
screen-relevant popular +20
```

Then deduplicate (case-insensitive, keep highest score), prefer shorter/
distinctive terms on ties, and apply the per-platform count limit
(iOS hard ceiling 100).

## Official references

- [Android EXTRA_BIASING_STRINGS](https://developer.android.com/reference/android/speech/RecognizerIntent#EXTRA_BIASING_STRINGS)
- [Apple contextualStrings](https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/contextualstrings)
