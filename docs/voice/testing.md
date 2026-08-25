# Testing

## Shared UK-English ASR corpus

One corpus drives both platforms. Include:

```text
different UK accents
slow speech / elderly speakers / fast speech
quiet rooms / background TV-radio / speaker output
Bluetooth headsets / wired headsets
organization names / publication names / creator names / locations / acronyms
short ambiguity choices / feedback commands
long natural content requests
```

Known difficult names (e.g. Tynedale, Herne Bay) belong in test fixtures and
SQLite data — never production resolver special cases.

## Configurations

```text
Android cloud/default en-GB
Android on-device en-GB
iOS network en-GB
iOS on-device en-GB
```

## Metrics

```text
top transcript accuracy
top-5 hypothesis recall
canonical entity top-1 accuracy / top-3 recall
false local-command rate
ambiguity rate
wrong auto-execution rate
ASR startup latency / final result latency
SQLite resolver latency
```

## Automated test coverage

- `voice-normalize.test.ts` — normalization, phonetic codes, generic ASR variants
- `voice-semantic-parser.test.ts` — generic grammar, modifiers, relations
- `voice-router.test.ts` — deterministic local commands (zero resolver calls), pending interactions
- `voice-match.test.ts` — resolver contract with a fake repository
- `sqlite-trigram-matcher-integration.test.ts` — trigram/phonetic ranking, distinctive-token weighting
- `voice-database.test.ts` — schema migration
- `voice-hardcode-guard.test.ts` — production code contains no catalog entity names
- Profanity/filler/entity-protection and recognition-profile tests (platform-guarded option assembly)

## Acceptance targets

- en-GB invariant on both platforms
- 5 hypotheses retained and independently sanitized
- 8-second window limits only time-to-begin-speaking; long speech is never cut
- Offline model absence never falls back to en-US
- Permissions/model dialogs never consume the 8-second window
