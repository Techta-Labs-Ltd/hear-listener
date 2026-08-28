# Direct Hear! Resolver and Search Contract

The mobile app uses the two real Hear! APIs directly:

```text
ASR
  -> local command routing
  -> local FTS5 transcript preparation
  -> POST https://resolver.hear.media/resolve
  -> ambiguity or spoken confirmation
  -> POST https://alexa.hear.media/api/v1/alexa/search
  -> normalized playback queue
```

## Authentication

Both APIs require `x-api-key`. Expo only embeds environment variables prefixed
with `EXPO_PUBLIC_`, so direct mobile access uses
`EXPO_PUBLIC_HEAR_SERVICE_KEY`.

Public Expo values can be extracted from an installed application. The direct
integration therefore requires a restricted, rate-limited, rotatable mobile
key. Do not reuse an unrestricted server credential.

## Resolver

`POST https://resolver.hear.media/resolve`

```json
{
  "utterance": "play the latest heatwave",
  "timezone": "Europe/London",
  "country_code": "gb"
}
```

Resolved entity confidence is an integer from `0` to `100`. Ambiguity
candidates do not contain confidence scores. The app therefore preserves
resolver candidate order, deduplicates by normalized canonical value, and
presents at most three choices.

`ambiguities` are authoritative even when `status` is `resolved`. Search never
runs before ambiguity selection and confirmation.

## Spoken confirmation

The mobile wording follows the current
[`hear-py` confirmation middleware](https://github.com/Techta-Labs-Ltd/hear-py/blob/main/src/middleware/confirmation.py):

- build a readable label from resolved category, tag, residual query, source,
  publication, location, latest flag, and publication dates;
- describe a topic-only discovery as `content on <topic>`;
- ask `Did you want me to play <complete label>?` for a resolved discovery;
- after an ambiguity choice, ask `Did you mean <selected canonical name>?`;
- if the answer is not a valid yes/no response, repeat the question once with
  `Please say yes or no.`;
- preserve the already-confirmed typed search request and execute it exactly
  once only after yes.

For example, category `sport`, residual query `update`, latest, and organisation
`York Talking News` becomes: `Did you want me to play the latest Sport Update
from York Talking News?` The raw ASR sentence is never echoed as confirmation.
A topic-only request for `history` becomes: `Did you want me to play content on
History?`.

## Resolver-to-search mapping

| Resolver value | Search request |
| --- | --- |
| `slots.residualQuery` | `q` |
| creator entity | `filter.creatorIds` |
| organization entity | `filter.organizationIds` |
| publication entity | `filter.publicationIds` |
| category entity | `filter.categorySlugs` |
| tag entity | `filter.tags` |
| non-overlapping location | `filter.city`, country/coordinates when present |
| `slots.publishedFrom` / `publishedTo` | inside `filter` |
| `slots.isPublication` | `filter.isPublication` |
| `slots.isRecommended` | top-level `isRecommended` |
| `slots.latest` | `sort: "latest"` |
| `sort: "relevance"` | omitted |

Category and tag IDs become exact filters only at resolver confidence `100`.
When a category and tag represent the same phrase, the category filter wins so
the request is not constrained twice. Two or more distinct exact tag matches
remain in `filter.tags`. A lower-confidence taxonomy phrase stays in `q`
instead of becoming an exact Meilisearch filter.

## Playback speed

Playback speed is always handled locally and never sent to the resolver. The
mobile app uses the same six exact levels as `hear-py`: `0.5`, `0.75`, `1`,
`1.25`, `1.5`, and `2`. Named first-through-sixth levels and Alexa-style
faster/slower phrases are supported; unconfigured values such as `1.4` are
rejected without snapping to another speed.

## Search

`POST https://alexa.hear.media/api/v1/alexa/search`

```json
{
  "q": "",
  "filter": { "categorySlugs": ["heatwave"] },
  "sort": "latest",
  "isLocal": false,
  "isRecommended": false,
  "page": 0,
  "limit": 3
}
```

The app consumes a confirmation token before starting search, preventing a
repeated callback from searching or playing twice. It flattens publication
tracks, rejects non-HTTPS audio, replaces file-like titles with readable
descriptions, plays the first result, and queues the rest of the first page.
