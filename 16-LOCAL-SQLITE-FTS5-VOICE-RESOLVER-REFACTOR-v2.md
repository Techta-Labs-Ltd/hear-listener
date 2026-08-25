# Hear! Listener — SQLite FTS5 Voice Resolver Full Refactor Plan

## Purpose

Refactor the entire `src/services/voice` stack so Hear! Listener resolves catalog/entity speech from the generated on-device SQLite database instead of hardcoded TypeScript names, aliases, special cases, or publisher-specific rules.

The most important rule is:

> **Catalog data is data, not code.**

If an organization, publication, creator, category, tag, location, or alias exists in Hear, it must be resolved from SQLite through the same generic pipeline as every other entity.

A value such as **Tynedale Talking Magazine** must never require a special branch in `resolver.ts`, `normalize.ts`, `local-command-router.ts`, ambiguity code, speech code, or any other voice service.

The existing voice architecture should remain local-first, accessible, and compatible with the Alexa/Hear interaction language, but **local semantic entity matching must be powered by the generated SQLite indexes**.

---

# 1. Scope

Files to refactor:

```text
src/services/voice/
  resolver.ts
  ambiguity-controller.ts
  diagnostics.ts
  events.ts
  executor.ts
  external-resolver.ts
  feedback-controller.ts
  interaction-controller.ts
  local-command-router.ts
  normalize.ts
  repository.ts
  request-ledger.ts
  screen-registry.ts
  speech-coordinator.ts
  speech.ts
  updates.ts
  voice-session-engine.ts
```

Also inspect:

```text
src/providers/
src/hooks/
src/stores/
src/types/
src/components/voice/
```

for code that duplicates resolver knowledge or bypasses the repository.

---

# 2. Current Problem to Eliminate

The existing architecture has a generated SQLite voice database, but the resolver layer still contains or has accumulated TypeScript knowledge that belongs in the database.

Bad pattern:

```ts
if (text.includes("tynedale talking magazine")) {
  return ...
}
```

Also bad:

```ts
const KNOWN_ORGANIZATIONS = [
  "Tynedale Talking Magazine",
  ...
];
```

Also bad:

```ts
const corrections = {
  "tyne dale": "Tynedale Talking Magazine",
};
```

Also bad:

```ts
switch (normalized) {
  case "some specific publication":
    ...
}
```

All of these create a second taxonomy inside the app.

That causes:

- stale catalog knowledge;
- duplicated data;
- inconsistent Alexa vs Listener behavior;
- more code every time an organization/publication is added;
- hard-to-debug ASR special cases;
- DB indexes being bypassed;
- large resolver files;
- impossible coverage for the full Hear catalog;
- behavior that only works for names developers happened to test.

---

# 3. Non-Negotiable Rules

## 3.1 No hardcoded catalog entities

Forbidden in production voice code:

```text
organization names
publication names
creator names
category names
tag names
location names
catalog IDs
entity-specific aliases
entity-specific ASR corrections
entity-specific pronunciation exceptions
```

These belong in SQLite seed/update data.

## 3.2 Hardcoding that is allowed

The app may contain generic interaction grammar:

```text
play
find
latest
recent
from
by
near me
recommended
publication
pause
resume
stop
back
home
left
right
select
cancel
help
```

These are interaction commands/modifiers, not catalog data.

Prefer generating Hear semantic phrase sets from the Alexa interaction contract where practical.

## 3.3 One local catalog resolver

All local entity resolution must pass through:

```text
VoiceResolver
  -> VoiceRepository
  -> SQLite
```

No other file directly searches a JS array of content entities.

## 3.4 SQLite is authoritative

For on-device entities:

```text
SQLite base rows
+ aliases
+ FTS5
+ trigram index
+ phonetic/metaphone keys
```

are the authoritative source.

## 3.5 Entity matching is generic

The same algorithm must resolve:

```text
Tynedale Talking Magazine
Any other organization
Any publication
Any creator
Any supported location
Any category/tag
```

without adding code.

---

# 4. Target Architecture

```text
ASR final transcript
        |
        v
PendingInteractionRouter
        |
        +-- ambiguity/feedback/confirmation command? --> local controller
        |
        v
LocalCommandRouter
        |
        +-- pause/back/read-screen/etc. -------------> local executor
        |
        v
PASS_TO_CONTENT_RESOLVER
        |
        v
VoiceResolver
        |
        +--> normalize generic grammar
        |
        +--> parse generic modifiers
        |
        +--> build entity-search spans
        |
        v
VoiceRepository
        |
        +--> exact normalized alias/name
        +--> FTS5 word/prefix
        +--> FTS5 trigram
        +--> metaphone/phonetic lookup
        |
        v
Candidate Merger + Ranker
        |
        +--> one strong candidate ------> resolved
        +--> close candidates ----------> ambiguity
        +--> no candidates -------------> unresolved
        |
        v
Canonical Voice Invocation
        |
        v
Executor
```

Important:

```text
resolver.ts DOES NOT contain the catalog
repository.ts DOES NOT decide app actions
executor.ts DOES NOT perform text matching
ambiguity-controller.ts DOES NOT re-run search
```

---

# 5. SQLite Data Model

Use the schema already generated by the project where possible.

If the current generated DB does not expose these concepts cleanly, migrate toward this logical model.

## 5.1 Entity table

```sql
CREATE TABLE voice_entities (
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,

  primary_metaphone TEXT,
  secondary_metaphone TEXT,

  popularity REAL DEFAULT 0,
  metadata_json TEXT,

  revision TEXT NOT NULL,

  PRIMARY KEY (entity_type, entity_id)
);
```

Entity types:

```text
organization
publication
creator
category
tag
location
```

Do not create a new entity type for every UI feature.

---

# 6. Alias Table

Every canonical entity may have zero or more aliases.

```sql
CREATE TABLE voice_aliases (
  alias_id INTEGER PRIMARY KEY,
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,

  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,

  primary_metaphone TEXT,
  secondary_metaphone TEXT,

  alias_source TEXT,
  weight REAL DEFAULT 1.0
);
```

Possible `alias_source` values:

```text
canonical
backend
editorial
alexa-interaction-model
validated-asr
legacy-migration
```

If an ASR pronunciation variant must be added, add it as **data** here.

Do not add a `resolver.ts` branch.

---

# 7. FTS5 Index

A generated search document should combine canonical name and aliases.

Logical example:

```sql
CREATE VIRTUAL TABLE voice_entity_fts
USING fts5(
  entity_key UNINDEXED,
  entity_type UNINDEXED,
  search_text,
  tokenize='trigram'
);
```

`search_text` may contain:

```text
canonical name
canonical name aliases
normalized aliases
```

The exact schema should match the generated DB and the SQLite build used by the production app.

Do not recreate/reseed FTS tables during every voice request.

---

# 8. Phonetic Indexes

FTS5 handles textual similarity.

Phonetic matching should use precomputed columns.

Recommended indexes:

```sql
CREATE INDEX idx_voice_alias_primary_metaphone
ON voice_aliases(primary_metaphone);

CREATE INDEX idx_voice_alias_secondary_metaphone
ON voice_aliases(secondary_metaphone);

CREATE INDEX idx_voice_entity_primary_metaphone
ON voice_entities(primary_metaphone);
```

Do not calculate metaphone for the entire database at runtime.

Calculate:

```text
DB entity phonetics -> build/update time
ASR query phonetics -> request time
```

The phonetic layer is intended to tolerate pronunciation/ASR variation, including UK speech variation, but it should be treated as one matching signal rather than a claim that a single phonetic algorithm perfectly covers every UK accent.

Use real ASR fixtures to tune it.

---

# 9. `repository.ts` — Complete Rewrite Responsibility

`repository.ts` becomes the only owner of local catalog SQL.

It should expose a small typed API.

Example:

```ts
export interface VoiceEntityRepository {
  isReady(): Promise<boolean>;

  searchEntities(
    query: EntitySearchQuery
  ): Promise<EntityCandidate[]>;

  getEntity(
    type: EntityType,
    id: string
  ): Promise<VoiceEntity | null>;

  getEntitiesByIds(
    refs: EntityRef[]
  ): Promise<VoiceEntity[]>;

  getRevision(): Promise<string>;

  healthCheck(): Promise<VoiceDbHealth>;
}
```

Input:

```ts
type EntitySearchQuery = {
  text: string;
  normalizedText: string;

  expectedTypes?: EntityType[];

  primaryMetaphone?: string;
  secondaryMetaphone?: string;

  limit: number;

  context?: {
    relation?: "from" | "by" | "in" | "about";
    screenId?: string;
  };
};
```

Candidate:

```ts
type EntityCandidate = {
  entityId: string;
  entityType: EntityType;

  canonicalName: string;
  matchedAlias?: string;

  matchMethod:
    | "exact"
    | "fts"
    | "trigram"
    | "phonetic"
    | "combined";

  scores: {
    exact: number;
    fts: number;
    trigram: number;
    phonetic: number;
    context: number;
    popularity: number;
    final: number;
  };

  metadata?: Record<string, unknown>;
};
```

---

# 10. Repository Search Strategy

The repository should perform multiple cheap indexed retrieval passes.

Do not load all entities into JS.

## Pass A — exact normalized lookup

```sql
SELECT ...
FROM voice_aliases a
JOIN voice_entities e
  ON e.entity_id = a.entity_id
 AND e.entity_type = a.entity_type
WHERE a.normalized_alias = ?
LIMIT ?;
```

Also search canonical normalized names.

This should have highest confidence.

## Pass B — FTS5

Use parameterized `MATCH`.

Return only top candidates.

Do not query every row.

## Pass C — trigram

Use the existing generated trigram FTS representation.

This is for:

```text
small ASR spelling mutations
merged/split words
partial name corruption
```

## Pass D — metaphone

Compute phonetic keys for the query once.

Use indexed equality against stored keys.

Example:

```sql
WHERE primary_metaphone IN (?, ?)
   OR secondary_metaphone IN (?, ?)
```

## Pass E — candidate merge

Merge candidates by:

```text
entity_type + entity_id
```

Do not create duplicate ambiguity choices because one entity matched through three methods.

---

# 11. Query Windowing

Do not search only the whole transcript.

Example:

```text
"play the latest publication from tynedale talking magazine"
```

The resolver should remove/claim generic command and modifier spans, then generate candidate phrase windows from the remaining semantic text.

Possible windows:

```text
tynedale talking magazine
talking magazine
tynedale talking
...
```

Search longest meaningful windows first.

Stop expanding when a strong entity span has been claimed.

This allows:

```text
play something by <creator>
play the latest from <organization>
find <publication>
play news from <location>
```

without hardcoding any entity.

---

# 12. `normalize.ts` — Make It Generic Only

Allowed:

```text
Unicode normalization
lowercasing
apostrophe normalization
whitespace collapse
safe punctuation removal
generic command grammar
generic semantic modifiers
```

Forbidden:

```ts
if (text === "tyne dale") ...
```

Forbidden:

```ts
const ORGANIZATION_CORRECTIONS = ...
```

Forbidden:

```ts
const KNOWN_PUBLICATIONS = ...
```

Entity aliases and corrections must come from SQLite.

Return a structured object, not only a string.

Example:

```ts
type NormalizedUtterance = {
  raw: string;
  normalized: string;
  tokens: string[];

  commandSpans: TextSpan[];
  modifierSpans: TextSpan[];

  modifiers: {
    latest: boolean;
    local: boolean;
    recommended: boolean;
    publication: boolean;
  };
};
```

---

# 13. `resolver.ts` — Become a Pure Orchestrator

`resolver.ts` should be small.

It must not contain:

```text
SQL strings
catalog names
catalog IDs
publisher aliases
publication aliases
creator aliases
hardcoded ASR entity corrections
screen-specific execution logic
TTS
navigation
feedback submission
```

Suggested flow:

```ts
async function resolveVoice(
  transcript: string,
  context: ResolverContext
): Promise<VoiceResolution> {

  const normalized = normalizeUtterance(transcript);

  const semantic = parseSemanticStructure(normalized);

  const entityCandidates =
    await resolveEntitySpans(semantic, context);

  const ranked =
    rankResolvedEntities(entityCandidates, semantic, context);

  return buildResolution(ranked, semantic, context);
}
```

Return only:

```ts
type VoiceResolution =
  | { kind: "resolved"; invocation: CanonicalInvocation }
  | { kind: "ambiguous"; ambiguity: ResolverAmbiguity }
  | { kind: "unresolved"; reason: UnresolvedReason }
  | { kind: "error"; code: string };
```

---

# 14. Candidate Ranking

Do not use one matching technique as the entire decision.

Use combined evidence.

Example conceptual scoring:

```text
exact normalized match         strongest
canonical name match           strongest
validated alias match          very strong
FTS phrase/token score         strong
trigram similarity             medium/strong
metaphone match                supporting
expected entity type           supporting
relation/context match         supporting
popularity                     weak tie-breaker only
```

Do not let popularity beat a much better textual/phonetic match.

A possible starting formula:

```ts
finalScore =
    exactScore       * 0.35
  + ftsScore         * 0.20
  + trigramScore     * 0.20
  + phoneticScore    * 0.15
  + contextScore     * 0.08
  + popularityScore  * 0.02;
```

These weights are starting points only.

Tune them against real ASR test fixtures.

---

# 15. Resolution Thresholds

Do not hide uncertainty.

Suggested initial policy:

```text
Top candidate very strong + clear margin
  -> RESOLVED

Top candidates close
  -> AMBIGUOUS

Weak candidates only
  -> UNRESOLVED
```

Example starting values:

```text
resolved threshold >= 0.84
minimum top-vs-second margin >= 0.08
ambiguity candidate floor >= 0.58
```

Do not treat these as permanent constants.

Move them to typed resolver configuration and tune using diagnostics.

---

# 16. Contextual Type Bias

Generic language can constrain entity type.

Examples:

```text
"from <x>"          -> organization can receive a type boost
"by <x>"            -> creator can receive a type boost
"publication <x>"   -> publication can receive a type boost
"in <x>"            -> location can receive a type boost
```

This is generic grammar.

It does not hardcode entity values.

The database still supplies the candidate.

---

# 17. `local-command-router.ts`

This file should only resolve deterministic app/device commands.

Examples:

```text
pause
resume
stop
next
previous
back
home
open library
open settings
read screen
cancel
help
left
right
select
repeat
```

It must not resolve catalog entities.

Bad:

```ts
"play tynedale talking magazine" -> hardcoded content action
```

Correct:

```text
"play tynedale talking magazine"
 -> PASS_TO_CONTENT_RESOLVER
 -> SQLite search
```

The word `play` may be recognized as semantic intent grammar, but the target is resolved from the DB.

---

# 18. `ambiguity-controller.ts`

The ambiguity controller should consume DB-backed candidates returned by `resolver.ts`.

It should never:

```text
search hardcoded names
run its own fuzzy matcher
call resolver again for left/right
reconstruct an entity from a label
```

State:

```ts
type PendingAmbiguity = {
  interactionId: string;
  requestId: string;
  sessionId: string;

  candidates: {
    entityId: string;
    entityType: EntityType;
    canonicalName: string;
    invocation: CanonicalInvocation;
    score: number;
  }[];

  selectedIndex: number;
  expiresAt: number;
};
```

Left/right only changes `selectedIndex`.

Select executes the stored canonical invocation.

---

# 19. `external-resolver.ts`

The generated local DB should be the normal entity resolver.

`external-resolver.ts` must not become a hidden second catalog matcher.

Allowed uses:

```text
explicit remote-only operations
server-required personalization
remote recommendation service
backend search after a valid locally-resolved semantic plan
optional controlled fallback if product policy requires it
```

Not allowed:

```text
local DB returns no match
 -> hardcoded remote publisher lookup
```

If fallback exists, it should receive the same canonical request contract and return canonical IDs.

It must never contain entity name special cases.

---

# 20. `executor.ts`

Executor receives a canonical invocation.

It does not parse speech.

Example:

```ts
{
  action: "PLAY_PUBLICATION",
  entity: {
    type: "publication",
    id: "pub_123"
  }
}
```

Executor may:

```text
navigate
start playback
pause
resume
open a result screen
start feedback
```

Executor must never do:

```ts
if (transcript.includes(...))
```

It must never run FTS5.

---

# 21. `interaction-controller.ts`

Own interaction state transitions:

```text
voice request
local command
content resolution
ambiguity
feedback
confirmation
execution
completion
```

It should route typed results.

It should never contain entity matching tables.

---

# 22. `feedback-controller.ts`

Feedback targets are IDs from current playback/screen context.

Do not resolve current target by comparing spoken title to hardcoded names.

Use:

```ts
{
  kind: "publication",
  publicationId,
  playbackSessionId
}
```

or:

```ts
{
  kind: "track",
  trackId,
  publicationId,
  playbackSessionId
}
```

If the user says:

```text
give feedback on <publication name>
```

and naming another entity is supported, resolve the named target through the same SQLite resolver.

---

# 23. `screen-registry.ts`

Screen registry provides context.

Example:

```ts
{
  screenId: "player",
  activeTrackId,
  activePublicationId,
  allowedLocalCommands,
  allowedSemanticCapabilities,
  stateVersion
}
```

It must not keep hardcoded catalogs.

Screen context may boost or constrain a result but must not replace DB resolution.

---

# 24. `request-ledger.ts`

Ledger remains responsible for:

```text
request identity
idempotency
completion receipts
retry relationships
navigation history
stale request rejection
```

No text matching.

No entity aliases.

Store canonical IDs, not speech labels, whenever possible.

---

# 25. `speech-coordinator.ts`

Speech coordinator only controls:

```text
TTS order
TalkBack/VoiceOver coordination
quiet mode
deduplication
cancel/speech completion
```

Entity names are passed in from resolved data.

Bad:

```ts
speak("Playing Tynedale Talking Magazine");
```

Correct:

```ts
speak(`Playing ${entity.canonicalName}`);
```

---

# 26. `speech.ts`

Keep templates generic.

Examples:

```ts
playingEntity(name)
resultsFound(count)
whichDidYouMean(nameA, nameB)
nothingFound()
databaseUpdating()
```

No catalog-specific messages.

---

# 27. `diagnostics.ts`

Diagnostics must make local matching understandable.

Record per resolution:

```ts
{
  requestId,
  sessionId,

  dbRevision,

  normalizedLength,

  candidateCount,

  winningEntityType,
  winningEntityId,
  winningMethod,

  scores: {
    exact,
    fts,
    trigram,
    phonetic,
    context,
    final
  },

  ambiguityCount,

  timingsMs: {
    normalization,
    exactLookup,
    ftsLookup,
    phoneticLookup,
    merge,
    rerank,
    total
  }
}
```

Do not permanently log full raw voice text in production unless product privacy policy explicitly permits it.

Use sampling/redaction.

---

# 28. `events.ts`

Use typed events.

Example:

```ts
type VoiceEvent =
  | { type: "ASR_FINAL"; transcript: string }
  | { type: "LOCAL_COMMAND_RESOLVED"; command: LocalCommand }
  | { type: "ENTITY_SEARCH_STARTED"; requestId: string }
  | { type: "ENTITY_SEARCH_COMPLETED"; requestId: string; candidateCount: number }
  | { type: "AMBIGUITY_OPENED"; interactionId: string }
  | { type: "COMMAND_EXECUTED"; requestId: string };
```

Do not carry giant DB rows in global events.

Carry canonical references.

---

# 29. `updates.ts` — DB Update Lifecycle

The resolver is only as good as its data.

`updates.ts` should own local voice DB revision updates.

Requirements:

```text
download/build update outside active query
verify checksum
verify schema version
verify content revision
run PRAGMA integrity_check
verify FTS integrity
verify expected base/index counts
atomically activate new DB
keep old DB until new DB is valid
invalidate prepared statements
publish DB_REVISION_CHANGED
```

Do not partially update canonical tables without their indexes.

---

# 30. Atomic DB Activation

Preferred flow:

```text
voice-v41.db active

download:
voice-v42.db.tmp

validate tmp

close new validation connection

rename:
voice-v42.db.tmp -> voice-v42.db

switch repository connection

only after successful switch:
delete old DB according to retention policy
```

Never leave the app in:

```text
new base rows
+ old FTS index
```

or:

```text
old aliases
+ new metaphone data
```

---

# 31. `voice-session-engine.ts`

The voice session engine should remain responsible only for:

```text
permission
microphone lifecycle
ASR start/stop
transcript finalization
session cancellation
screen snapshot
routing trigger
```

It should not know:

```text
Tynedale
organizations
publications
FTS SQL
metaphone tables
candidate weights
```

Once final transcript exists:

```text
voice-session-engine
 -> interaction-controller
 -> local-command-router
 -> resolver
```

---

# 32. Database Readiness

Voice resolution must know whether DB is usable.

Repository health:

```ts
type VoiceDbHealth = {
  ready: boolean;
  schemaVersion: number;
  contentRevision: string | null;

  entityCount: number;
  aliasCount: number;
  ftsReady: boolean;
  phoneticReady: boolean;

  lastError?: string;
};
```

If DB is updating:

```text
existing valid active DB remains readable
```

Do not disable voice just because a new revision is downloading.

If there is no usable DB:

```text
local app commands still work
content request -> controlled "content index unavailable" state
```

No hidden hardcoded fallback catalog.

---

# 33. Prepared Statements and Connection Lifetime

Keep SQLite connection open.

Do not:

```text
open DB
run one query
close DB
```

for every ASR request.

Reuse prepared queries where the SQLite library supports it.

Limit result sets.

Recommended:

```text
exact candidates: <= 8
FTS/trigram candidates: <= 20
phonetic candidates: <= 20
merged rerank pool: <= 30
ambiguity choices shown: <= 5
```

Tune using real timings.

---

# 34. Performance Targets

On a representative mid-range Android device:

```text
generic normalization      p95 < 5 ms
exact lookup               p95 < 10 ms
FTS/trigram retrieval      p95 < 30 ms
phonetic retrieval         p95 < 20 ms
candidate rerank           p95 < 10 ms

total local entity resolve p95 target < 80 ms
```

These are engineering targets, not assumptions.

Measure them through `diagnostics.ts`.

The key rule is:

```text
No network round trip should be required to identify a locally indexed entity.
```

---

# 35. Avoid JS Full-Catalog Matching

Do not:

```ts
const allEntities = await db.getAllAsync(...);

allEntities.map(...)
allEntities.filter(...)
rapidFuzzyAgainstEverything(...)
```

That defeats the SQLite architecture.

JS may rerank only the small candidate set retrieved by indexed SQL.

---

# 36. Search Safety

Every SQL input must be parameterized.

For FTS `MATCH`, construct a safe query representation.

Handle speech containing:

```text
apostrophes
quotes
hyphens
slashes
parentheses
FTS operators
unicode punctuation
```

Do not concatenate raw transcript into SQL.

---

# 37. Candidate Span Ownership

When one entity is accepted, mark its transcript span as claimed.

Example:

```text
play the latest publication from tynedale talking magazine
                                ^^^^^^^^^^^^^^^^^^^^^^^^^^
                                organization span
```

Do not then separately treat:

```text
talking
magazine
```

as unrelated residual search terms.

Prefer longest high-confidence entity spans.

---

# 38. Multiple Entities

The resolver should support multiple semantic entities when the command permits them.

Example:

```text
play stories by <creator> from <location>
```

Possible result:

```ts
{
  creatorIds: [...],
  city: ...,
  residualQuery: "stories"
}
```

Entity matching must be type-aware and span-aware.

---

# 39. Ambiguous Duplicate Names

Two entities may share the same or similar name.

Do not arbitrarily choose one.

Use:

```text
type context
canonical metadata
location if applicable
screen context
popularity as weak tie-breaker
```

If still close:

```text
return ambiguity
```

The ambiguity controller handles selection locally.

---

# 40. ASR Phonetic Tolerance

Use the existing trigram + phonetic strategy as complementary layers.

Examples of errors to cover in tests:

```text
word split
word merge
vowel variation
voicing variation
dropped consonant
inserted consonant
similar sounding syllable
ASR punctuation differences
```

For entity names, create fixtures from actual observed ASR output.

If a recurring variation needs support:

```text
add validated alias/phonetic data to DB generation
```

not:

```text
add if statement to resolver.ts
```

---


# 40A. Severe ASR Corruption Recovery — Example: `Tynedale` → `tinder`

A realistic ASR failure may look like:

```text
User intends:
"play Tynedale Talking Magazine"

ASR returns:
"play tinder talking magazine"
```

The resolver must recover this through the generic SQLite-backed matching pipeline. It must **not** add a production special case such as:

```ts
if (text.includes("tinder")) {
  return "Tynedale Talking Magazine";
}
```

That pattern is forbidden.

## 40A.1 Metaphone Is Only One Signal

Do not assume:

```text
metaphone("tinder") === metaphone("tynedale")
```

Severe ASR corruption can change consonants, vowels, syllable boundaries, word length, and word splitting.

Support both:

```text
exact phonetic-key matches
+
near phonetic-code similarity inside a bounded candidate pool
```

Metaphone helps the resolver; it is not the resolver.

## 40A.2 Whole-Phrase Retrieval First

Given:

```text
tinder talking magazine
```

search the longest meaningful phrase first:

```text
tinder talking magazine
tinder talking
tinder
```

The surrounding phrase can recover a badly transcribed distinctive token.

```text
ASR:
tinder   talking magazine

DB:
tynedale talking magazine
         ^^^^^^^^^^^^^^^^
         strong phrase overlap
```

FTS5/trigram retrieval should therefore return `Tynedale Talking Magazine` as a candidate even when the first token is corrupted.

## 40A.3 Distinctive Token Weighting

Common catalog words such as:

```text
talking
magazine
newspaper
news
audio
publication
society
association
service
```

must carry less weight than distinctive entity tokens.

Prefer DB-derived token rarity / inverse-document-frequency style weighting where practical.

Do not maintain a growing hardcoded list of every generic organization term.

The goal is:

```text
rare/distinctive token agreement
  >
generic suffix agreement
```

so `talking magazine` alone cannot dominate ranking.

## 40A.4 Candidate Pool Before Phonetic Distance

Do not calculate phonetic edit distance against the whole catalog in JavaScript.

Correct flow:

```text
exact / FTS5 / trigram retrieval
        ↓
bounded candidate pool
        ↓
phonetic reranking
```

Suggested limits:

```text
FTS/trigram pool: <= 20
phonetic expansion: <= 20
merged rerank pool: <= 30
```

Only inside this bounded pool should the resolver calculate more expensive phonetic similarity.

## 40A.5 Phonetic-Code Similarity, Not Equality Only

Store primary and secondary Double Metaphone codes for canonical names and aliases.

At query time compare:

```text
query primary   vs candidate primary
query primary   vs candidate secondary
query secondary vs candidate primary
query secondary vs candidate secondary
```

Use the strongest valid score.

Conceptually:

```ts
similarity =
  1 - levenshtein(a, b) / Math.max(a.length, b.length)
```

This is only performed on the bounded candidate set.

Do not run phonetic Levenshtein over the complete catalog.

## 40A.6 Token-Level Phonetic Comparison

For multi-word names, whole-phrase phonetics may hide the corrupted distinctive token.

Example:

```text
ASR token:       tinder
candidate token: tynedale
```

Evaluate the distinctive token using:

```text
orthographic trigram similarity
+
phonetic-code similarity
+
token-position/context similarity
```

while `talking magazine` contributes phrase coverage.

## 40A.7 Validated ASR Aliases Belong in SQLite

If real device testing repeatedly shows:

```text
Tynedale -> tinder
Tynedale -> tyne dale
Tynedale -> tindale
```

store these as SQLite aliases, not TypeScript branches.

Example:

```text
voice_aliases

entity_id: org_123
entity_type: organization
alias: Tinder
alias_source: validated-asr
```

All aliases point to the same canonical entity ID.

## 40A.8 Alias Promotion Must Be Controlled

Do not automatically convert every bad transcript into a permanent alias.

Use:

```text
ASR transcript
 -> resolver candidate/ambiguity
 -> user confirms canonical entity
 -> diagnostics record transcript-to-entity evidence
 -> repeated evidence accumulates
 -> alias is validated
 -> next DB revision includes it
```

Promotion may require:

```text
manual/editorial validation
OR
minimum repeated confirmations
OR
offline analytics review
```

Production resolver code does not change.

## 40A.9 Severe-Corruption Ranking

The candidate ranker should combine:

```text
exact alias
FTS phrase score
trigram similarity
distinctive-token similarity
whole-phrase coverage
Double Metaphone exact match
phonetic-code distance
expected entity type
relation/context
validated-ASR alias weight
weak popularity tie-breaker
```

Generic suffix overlap such as `talking magazine` must never overwhelm poor distinctive-token evidence.

## 40A.10 Suggested Match Evidence

Diagnostics should expose why a candidate won:

```ts
type MatchEvidence = {
  exactAlias: number;
  fts: number;
  trigram: number;

  phoneticExact: number;
  phoneticDistance: number;

  distinctiveToken: number;
  phraseCoverage: number;

  expectedType: number;
  relationContext: number;

  aliasSource?:
    | "canonical"
    | "backend"
    | "validated-asr"
    | "editorial";

  final: number;
};
```

## 40A.11 Ambiguity Safety

If severe ASR corruption leaves two candidates close:

```text
do not guess
```

Return ambiguity.

For example:

```text
candidate A = 0.83
candidate B = 0.80
```

If the configured margin is insufficient, return `AMBIGUOUS` and let the ambiguity controller handle selection locally.

## 40A.12 Concrete Recovery Flow

```text
"play tinder talking magazine"

1. Generic command parser
   action = PLAY

2. Semantic phrase
   "tinder talking magazine"

3. Exact alias lookup
   maybe no match

4. FTS5/trigram retrieval
   candidate pool includes:
   - Tynedale Talking Magazine
   - other similar entities

5. Query phonetics
   generate Double Metaphone primary/secondary codes

6. Rerank candidates with:
   - phrase coverage
   - distinctive-token score
   - trigram
   - phonetic exact/distance
   - alias source
   - expected type/context

7. Clear winner
   -> RESOLVED

8. Close candidates
   -> AMBIGUOUS

9. If user repeatedly confirms Tynedale for "tinder"
   -> validated-asr alias may be added to a later DB revision
```

At no point should production code contain:

```ts
if (text.includes("tinder")) {
  // Tynedale special case
}
```

## 40A.13 Required Tests

### Severe first-token corruption

```text
DB:
Tynedale Talking Magazine

ASR:
tinder talking magazine

Expected:
Tynedale candidate appears in bounded candidate pool
```

### Phrase evidence

```text
Expected:
whole-phrase evidence outranks generic "talking magazine" overlap
```

### Validated alias

```text
DB alias:
tinder -> Tynedale Talking Magazine

Expected:
strong canonical resolution
```

### Phonetic near-match

```text
Metaphone codes differ slightly

Expected:
phonetic similarity remains > 0
instead of discarding the candidate
```

### Collision

```text
two similarly named talking-magazine entities

Expected:
ambiguity when score margin is insufficient
```

### Hardcode guard

Production voice code must not contain:

```text
"Tynedale Talking Magazine"
"tinder" -> "Tynedale"
```

outside tests/documentation.

## 40A.14 Final Rule

```text
ASR corruption
   |
   +--> phrase/trigram evidence
   +--> token evidence
   +--> phonetic evidence
   +--> DB aliases
   +--> context
   |
   v
generic candidate ranking
```

If recurring ASR behavior needs teaching:

```text
teach the database
```

not:

```text
teach resolver.ts with another if statement
```


# 41. Alexa Interaction Compatibility

The Listener content resolver should continue accepting the same semantic interaction language as Hear Alexa.

Generic phrases may come from a generated interaction contract.

Examples:

```text
play ...
play me ...
find ...
find me ...
let me hear ...
latest ...
from ...
by ...
near me ...
recommended ...
```

But the **values filling those semantic roles come from SQLite**.

Alexa interaction language:

```text
defines how the user asks
```

SQLite:

```text
defines what entities exist
```

These concerns must stay separate.

---

# 42. Local Command vs Content Resolver Boundary

Examples:

```text
"pause"
 -> LocalCommandRouter
 -> no SQLite entity search required

"go back"
 -> LocalCommandRouter

"read this screen"
 -> LocalCommandRouter

"play Tynedale Talking Magazine"
 -> semantic command recognized
 -> SQLite resolves target

"play the latest publication from Tynedale Talking Magazine"
 -> generic modifiers parsed
 -> SQLite resolves organization
 -> canonical content plan

"find something from a talking newspaper"
 -> generic request
 -> DB/context resolution or unresolved/clarification
```

---

# 43. Remove Legacy Hardcodes

Before refactor is considered complete, recursively search:

```text
src/services/voice
src/providers
src/hooks
src/stores
src/types
src/components/voice
```

for:

```text
specific organization names
specific publication names
specific creator names
specific IDs
known ASR correction maps
legacy aliases
demo/test publisher constants
```

Move real aliases into DB generation fixtures/data.

Delete production hardcodes.

Test-only fixture names may remain in test files.

---

# 44. Add a Hardcode Guard Test

Create a test/lint rule to prevent the same problem returning.

At minimum:

```text
voice production files may not import catalog seed fixtures
voice production files may not define catalog entity arrays
resolver may not contain specific fixture entity names
```

A temporary regression assertion can explicitly check that known legacy names such as:

```text
Tynedale Talking Magazine
```

do not occur under production `src/services/voice`.

The long-term rule should be structural, not a growing blacklist.

---

# 45. Repository Contract Tests

Test using an isolated generated SQLite fixture.

Required:

## Exact

Canonical entity name resolves.

## Alias

Database alias resolves to canonical ID.

## Trigram

Minor transcription corruption returns same ID.

## Phonetic

Phonetically similar ASR variant returns same ID.

## Combined

Weak trigram + phonetic agreement beats unrelated FTS candidate.

## Collision

Two near names return ambiguity.

## Entity type context

`by X` boosts creator.

`from X` boosts organization.

## No result

Returns unresolved.

Never manufacture a hardcoded fallback.

---

# 46. Full Database Characterization Test

For each DB entity:

```text
canonical name
 -> search
 -> expected entity ID appears in candidate set
```

For each alias:

```text
alias
 -> expected entity ID appears
```

This catches index-generation bugs.

Run against a representative database snapshot in CI where size is manageable.

---

# 47. ASR Fixture Corpus

Create:

```text
tests/fixtures/voice/asr-en-GB.json
```

Structure:

```json
[
  {
    "spoken": "expected intended phrase",
    "transcript": "actual ASR output",
    "expectedEntityType": "organization",
    "expectedEntityId": "..."
  }
]
```

Collect fixtures from:

```text
Android speech recognizer
different UK speakers
different speaking rates
real TalkBack users
noisy environments where appropriate
```

Use anonymized/non-sensitive fixtures.

---

# 48. Resolver Unit Tests

`resolver.ts` should be testable with a repository interface.

Inject a fake repository.

Tests:

```text
normalization does not know catalog
repository result becomes canonical invocation
expected type changes ranking
close results produce ambiguity
weak results produce unresolved
screen context does not invent entity
local-only commands never enter resolver
```

---

# 49. Integration Tests

End-to-end:

```text
ASR text
 -> local-command-router
 -> resolver
 -> SQLite
 -> ambiguity/resolved
 -> executor
```

Required scenarios:

```text
known organization
known publication
known creator
known alias
ASR misspelling
phonetic match
duplicate/ambiguous name
latest modifier
local modifier
screen context
feedback target
cancel during resolution
DB revision swap
```

---

# 50. Diagnostics During Development

Development logs should make ranking visible.

Example:

```text
VOICE_RESOLVE request=...
dbRevision=42

query="..."

candidate[0]
  type=organization
  id=...
  method=combined
  exact=0
  fts=.87
  trigram=.91
  phonetic=1
  context=.95
  final=.90

candidate[1]
  ...
```

This is how matching should be tuned.

Do not tune by adding special-case `if` statements.

---

# 51. File-by-File Final Responsibility

| File | Final responsibility |
|---|---|
| `resolver.ts` | Generic semantic orchestration and candidate ranking |
| `repository.ts` | All SQLite entity/index queries |
| `normalize.ts` | Generic transcript normalization + modifiers only |
| `local-command-router.ts` | Deterministic app/device commands only |
| `ambiguity-controller.ts` | Select among already-resolved canonical candidates |
| `diagnostics.ts` | Resolver timing/ranking/health telemetry |
| `events.ts` | Typed lifecycle and resolution events |
| `executor.ts` | Execute canonical actions; no speech parsing |
| `external-resolver.ts` | Explicit remote-only/fallback boundary; no catalog hardcodes |
| `feedback-controller.ts` | Feedback workflow on canonical IDs |
| `interaction-controller.ts` | Interaction ownership/state routing |
| `request-ledger.ts` | Idempotency and request receipts |
| `screen-registry.ts` | Screen capabilities/context |
| `speech-coordinator.ts` | TTS/accessibility serialization |
| `speech.ts` | Generic speech templates |
| `updates.ts` | Voice DB version/update/integrity/atomic activation |
| `voice-session-engine.ts` | ASR lifecycle and session orchestration |

---

# 52. Proposed Internal Modules

Keep the public `src/services/voice` API if changing imports would be disruptive, but split implementation internally.

```text
src/services/voice/
  resolver.ts
  repository.ts

  matching/
    candidate-types.ts
    entity-search.ts
    candidate-merge.ts
    candidate-ranker.ts
    query-spans.ts
    phonetic.ts
    fts-query.ts
    resolver-config.ts

  local-command-router.ts

  ambiguity-controller.ts
  feedback-controller.ts
  interaction-controller.ts

  executor.ts
  request-ledger.ts

  screen-registry.ts

  speech-coordinator.ts
  speech.ts

  diagnostics.ts
  events.ts
  updates.ts

  external-resolver.ts
  voice-session-engine.ts
```

Do not create one giant replacement `resolver.ts`.

---

# 53. Migration Sequence

## Phase 1 — Freeze behavior

Before deleting code:

- add resolver diagnostics;
- add tests for current expected valid behavior;
- collect known bad hardcoded examples;
- record DB schema/revision;
- identify all production entity hardcodes.

## Phase 2 — Fix repository

Implement typed indexed queries:

```text
exact
FTS
trigram
phonetic
```

Verify against the generated DB.

## Phase 3 — Build generic candidate pipeline

Add:

```text
span generation
candidate merge
scoring
expected-type bias
ambiguity thresholds
```

## Phase 4 — Rewrite `resolver.ts`

Remove entity data.

Make it repository-driven.

## Phase 5 — Clean local router

Keep only deterministic device/app commands.

All content targets go to SQLite resolution.

## Phase 6 — Fix ambiguity

Store canonical candidates and select locally.

## Phase 7 — Fix controllers/executor

Ensure they consume canonical IDs, not transcript matching.

## Phase 8 — Fix DB updates

Add integrity/version/atomic activation.

## Phase 9 — Delete legacy hardcodes

Run recursive search and remove dead maps/special cases.

## Phase 10 — Performance tune

Tune SQL indexes, result limits, and scoring using diagnostics.

## Phase 11 — Regression

Run full ASR + accessibility + voice lifecycle suite.

---

# 54. Implementation Guardrails

Do not solve a failing entity by adding another string constant.

Do not copy the database into JS memory.

Do not query with `%LIKE%` over the whole entity table as the normal path.

Do not make metaphone the only resolver.

Do not make trigram the only resolver.

Do not execute a candidate below confidence policy.

Do not suppress ambiguity just to make demos look successful.

Do not send local indexed entity names to a remote service merely because the local resolver is poorly wired.

Fix the local indexed resolver.

---

# 55. Definition of Done

The resolver refactor is complete only when:

- [ ] `resolver.ts` contains zero production catalog entity names.
- [ ] `normalize.ts` contains zero entity-specific corrections.
- [ ] `local-command-router.ts` contains only app/device commands and generic grammar.
- [ ] No production voice file contains `Tynedale Talking Magazine` as a special case.
- [ ] All local entities are discovered through `repository.ts`.
- [ ] Repository uses indexed SQLite queries rather than loading the catalog into JS.
- [ ] Exact, FTS5, trigram, and phonetic candidate retrieval are working.
- [ ] Duplicate candidates from different match methods are merged by canonical entity ID.
- [ ] Resolver ranking uses generic scores/context.
- [ ] Close candidates return ambiguity.
- [ ] Ambiguity selection does not re-query the resolver.
- [ ] Executor receives canonical IDs and never parses raw speech.
- [ ] Feedback works on canonical track/publication IDs.
- [ ] Speech templates receive canonical labels from resolved data.
- [ ] DB update process validates and atomically activates index revisions.
- [ ] Existing valid DB remains available while a new revision downloads.
- [ ] Local commands work even when content DB is unavailable.
- [ ] No network call is necessary to identify a locally indexed entity.
- [ ] A generated DB characterization test covers canonical names and aliases.
- [ ] Real ASR corruption fixtures cover trigram and phonetic recovery.
- [ ] Severe ASR corruption such as `Tynedale -> tinder` can recover through generic phrase/trigram/phonetic/context ranking without production hardcodes.
- [ ] Phonetic matching supports bounded candidate-pool similarity/distance and does not require exact Metaphone-code equality only.
- [ ] Repeated confirmed ASR corruptions can be promoted into SQLite as `validated-asr` aliases without changing production TypeScript.
- [ ] Distinctive-token weighting prevents generic suffixes such as `talking magazine` from dominating entity ranking.
- [ ] Resolver latency is measured and meets the agreed device target.
- [ ] Alexa-compatible Hear semantic phrasing remains supported.
- [ ] Voice lifecycle, ambiguity, feedback, TalkBack/VoiceOver, and request-ledger behavior remain intact.

---

# 56. Direct Coding-Agent Instruction

Refactor `src/services/voice` under these rules:

1. Inspect the current generated SQLite schema before changing production code.
2. Find every catalog entity name, ID, alias map, ASR entity correction, and publisher/publication special case in production voice code.
3. Classify each value:
   - generic command grammar -> may remain/configure;
   - catalog knowledge -> must move to DB/index generation;
   - test fixture -> keep only in tests.
4. Make `repository.ts` the only local catalog SQL boundary.
5. Implement indexed exact + FTS5 + trigram + phonetic candidate retrieval.
6. Keep all result sets bounded.
7. Merge candidates by canonical `entity_type + entity_id`.
8. Rank with generic text, phonetic, type/context, and weak popularity signals.
9. Rewrite `resolver.ts` as orchestration only.
10. Remove all entity-specific branches.
11. Keep `local-command-router.ts` limited to deterministic native/app actions.
12. Return canonical resolved/ambiguous/unresolved results.
13. Make ambiguity operate on stored canonical candidates.
14. Ensure executor/controllers use IDs and never perform text resolution.
15. Make DB updates revisioned, integrity-checked, and atomic.
16. Add diagnostics before tuning thresholds.
17. Add regression tests proving that a database entity can be added without changing TypeScript resolver code.
18. Add a guard test preventing production hardcoded fixture/entity names from returning.
19. Preserve the existing app-wide voice session/accessibility architecture.
20. Do not declare the refactor finished until a new organization/publication can be added to the generated SQLite DB and immediately becomes voice-resolvable **without changing any production resolver TypeScript**.

---

# Final Architectural Rule

```text
USER SPEECH
    |
    v
GENERIC COMMAND / INTENT GRAMMAR
    |
    v
SQLITE ENTITY INDEX
    |
    +--> exact
    +--> FTS5
    +--> trigram
    +--> phonetic / metaphone
    |
    v
GENERIC RANKING
    |
    +--> resolved
    +--> ambiguity
    +--> unresolved
```

Not:

```text
USER SPEECH
    |
    v
resolver.ts
    |
    +--> special case Tynedale
    +--> special case publisher B
    +--> special case publication C
    +--> growing hardcoded garbage
```

The database must define **what exists**.

The resolver code must define **how matching works**.
