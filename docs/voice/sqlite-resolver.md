# SQLite Resolver

The resolver understands the Hear! catalog; the platform recognizer only
produces transcripts.

## Data model

- `voice_entities` — canonical entities (organization, publication, creator,
  category, tag, location, story) with precomputed primary/secondary phonetic
  codes and popularity.
- `voice_aliases` — canonical/editorial/validated-asr aliases with
  `alias_source`.
- `voice_entity_fts` — FTS5 index over alias text (unicode61).
- `voice_entity_trigrams` — precomputed trigram index.
- `voice_token_rarity` — DB-derived token rarity for distinctive-token
  weighting.

See `scripts/generate-voice-database.mjs` and
`scripts/voice-data/catalogue.json` (data, not code).

## Retrieval passes (repository.ts)

```text
A exact normalized alias/name
B FTS5 word/prefix MATCH
C trigram overlap
D primary/secondary phonetic code match
E merge candidates by entity_type + entity_id
```

All passes are bounded (exact 8, FTS/trigram/phonetic 20, merge pool 30,
ambiguity choices 5). SQL is parameterized; FTS queries are built with quoted
tokens.

## Ranking (matching/candidate-ranker.ts)

```text
final = exact*0.35 + fts*0.20 + trigram*0.20 + phonetic*0.15
      + context*0.08 + popularity*0.02
```

- Trigrams are blended with rarity-weighted distinctive-token coverage so
  generic suffixes (`talking magazine`) never dominate.
- Context score reflects relation-derived expected types (`by` -> creator,
  `from` -> organization/publication/location, `in` -> location,
  `about` -> category/tag).
- Thresholds: resolved >= 0.84 with >= 0.08 margin; ambiguity floor 0.58;
  otherwise unresolved. Configurable in `matching/resolver-config.ts`.

## Validated ASR aliases

Recurring confirmed ASR corruptions (e.g. `tinder` for `Tynedale`) are added to
SQLite as `validated-asr` aliases in the next DB revision. Production
TypeScript never contains entity special cases — a hardcode guard test
(`voice-hardcode-guard.test.ts`) enforces this.

## Rules

- `resolver.ts` is orchestration only: no SQL, no catalog names.
- `repository.ts` is the only local catalog SQL boundary.
- Ambiguity returns canonical candidates; selection never re-queries the
  resolver.
- A new entity added to the generated DB becomes voice-resolvable with no
  TypeScript change.
