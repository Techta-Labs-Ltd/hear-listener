# Fix 15 — Listener ASR Parity with the Alexa `en-GB.json` Interaction Model

## Objective

The Hear! Listener mobile app must **not create a different voice language from Alexa**.

For content/domain requests, anything users can naturally say through the Alexa `en-GB.json` interaction model should continue to work in Listener with the same meaning.

Listener can add mobile-native commands, but it must not break, rename, narrow, or reinterpret the existing Alexa interaction language.

---

## 1. Source of Truth

Authoritative interaction language:

```text
hear-py/en-GB.json
```

Treat it as a compatibility contract containing:

- custom intent names;
- sample utterances;
- slots;
- custom slot types;
- synonyms;
- entity wording;
- built-in intent coverage.

Do **not** manually maintain a second independent set of Hear content utterances in React Native.

The current Python resolver already learns command vocabulary, phrases, starters, and source-carrier wording from `en-GB.json`. Listener must stay aligned with that same corpus.

---

## 2. Existing Semantic Intent Families to Preserve

The current Hear resolver explicitly recognizes these Alexa search intent families:

```text
PlayContentIntent
PlayByCreatorIntent
PlayByOrganizationIntent
PlayPublicationIntent
BrowseContentIntent
BrowseByCategoryIntent
WhatsTrendingIntent
PlayLocalIntent
PlayRecommendationIntent
```

All existing `en-GB.json` samples under these intents remain valid Listener ASR requests.

Examples of semantics that must remain compatible:

```text
play ...
play me ...
find ...
find me ...
give me ...
let me hear ...
I want to hear ...
I would like to hear ...
search for ...
put on ...
recommend ...
```

Modifiers already understood by the resolver must continue to mean the same thing:

```text
latest
most recent
newest
recent

near me
nearby
local
my area
my town
my city
my community

recommended
for me
something I might like
based on what I listen to

publication
publications
```

Content nouns must remain compatible:

```text
audio
content
episode
publication
recording
story
track
podcast
article
```

Do not replace this vocabulary with a smaller mobile-only grammar.

---

## 3. Intent Partition — Same Language, Correct Runtime Owner

The interaction language is shared, but execution ownership differs by platform.

### A. Shared Hear Semantic Intents

These go through the Hear semantic resolver:

```text
PlayContentIntent
PlayByCreatorIntent
PlayByOrganizationIntent
PlayPublicationIntent
BrowseContentIntent
BrowseByCategoryIntent
WhatsTrendingIntent
PlayLocalIntent
PlayRecommendationIntent
```

Runtime:

```text
ASR transcript
 -> LocalCommandRouter does not claim it
 -> RemoteResolverAdapter
 -> Hear resolver
 -> resolved / ambiguous / unresolved
```

### B. App-Local Equivalents

These are interpreted locally in Listener:

```text
AMAZON.HelpIntent       -> help / voice help
AMAZON.CancelIntent     -> cancel current interaction
AMAZON.StopIntent       -> context-aware stop
AMAZON.PauseIntent      -> pause player
AMAZON.ResumeIntent     -> resume player
```

Listener should support natural aliases around these commands, but Alexa-compatible wording must remain valid.

Examples:

```text
pause
pause this
stop
stop playing
resume
continue
carry on
cancel
never mind
help
what can I say
```

These commands must produce **zero semantic resolver requests**.

### C. Mobile-Only Local Commands

Listener may add:

```text
go home
go back
open library
open discover
open settings
read this screen

left
right
previous option
next option
select
choose this
repeat options

give feedback
feedback on this track
feedback on this publication
```

Plus native events:

```text
shake
tilt left
tilt right
accessible swipe/select actions
```

These do not change Alexa semantics because they are additive Listener capabilities.

### D. Alexa Transport / Device Lifecycle Only

Do not try to reproduce these as ASR intents in Listener:

```text
LaunchRequest
SessionEndedRequest
AudioPlayer.PlaybackStarted
AudioPlayer.PlaybackStopped
AudioPlayer.PlaybackFinished
AudioPlayer.PlaybackNearlyFinished
AudioPlayer.PlaybackFailed
```

Listener has its own app/player lifecycle events.

Preserve the **behavioral purpose**, not the Alexa transport object.

---

## 4. Runtime ASR Pipeline

```text
Accessible voice invocation
        |
        v
VoiceSessionEngine
        |
        v
native ASR start confirmation
        |
        v
"Speak now"
        |
        v
raw transcript
        |
        +--> PendingInteractionRouter
        |       ambiguity / feedback / confirmation owns input first
        |
        +--> LocalCommandRouter
        |       navigation / playback / help / cancel / screen actions
        |
        +--> PASS_TO_REMOTE
                |
                v
        AlexaParityRequestAdapter
                |
                v
        Hear Resolver
                |
        +-------+---------+
        |       |         |
     resolved ambiguous unresolved
```

Important: **do not send every transcript to the server and then decide whether it was local**.

Local/native commands are claimed first.

---

## 5. Raw Transcript Rule

Keep both:

```ts
{
  rawTranscript: string;
  localNormalizedTranscript: string;
}
```

### Raw transcript

Send the user's original ASR transcript to the Hear resolver.

Do not aggressively rewrite it in the mobile app.

The Python resolver already owns:

- utterance normalization;
- spelling/correction logic;
- interaction-model vocabulary;
- entity matching;
- temporal modifiers;
- local/location modifiers;
- category/tag matching;
- creator matching;
- organization matching;
- publication matching;
- ambiguity detection.

### Local normalized transcript

Use only for deterministic mobile commands.

Recommended normalization:

```text
Unicode normalize
lowercase
trim
collapse whitespace
safe punctuation removal
```

Do not run aggressive fuzzy correction over semantic content before the backend sees it.

---

## 6. Resolver Contract for Listener

Listener should use the same resolver behavior without pretending to be an Alexa device.

Recommended request:

```ts
type ListenerResolverRequest = {
  version: 1;
  operation: "resolve_search";

  requestId: string;
  sessionId: string;

  utterance: string;
  locale: "en-GB";

  timezone: string;

  userContext?: {
    userId?: string;
  };

  locationContext?: {
    latitude?: number;
    longitude?: number;
    city?: string;
  };

  screenContext?: {
    screenId: string;
    activeEntity?: {
      type: "track" | "publication" | "organization" | "creator";
      id: string;
    };
  };

  intentHint?: string;
};
```

### Backend Compatibility Change

Do not force mobile to populate `alexaIntent`.

The resolver should support:

```python
intent_hint = request.get("intentHint") or request.get("alexaIntent") or ""
```

Alexa continues sending `alexaIntent`.

Listener may send `intentHint` when it has a safe high-confidence hint.

This is backward compatible.

---

## 7. Do Not Build a Second Full Intent Classifier in the App

The app does **not** need to duplicate Alexa NLU.

Use the interaction model for:

1. compatibility tests;
2. command-language vocabulary;
3. optional conservative intent hints;
4. documentation.

The Hear resolver remains authoritative for semantic/domain interpretation.

Mobile only performs strong deterministic matching for app-local actions.

This prevents:

```text
Alexa understands phrase X
Listener parser understands phrase Y
```

from becoming two divergent products.

---

## 8. Interaction-Model Compiler

Add a small tool that reads:

```text
hear-py/en-GB.json
```

and generates a versioned compatibility manifest for Listener tests.

Suggested script:

```text
tools/build-listener-interaction-contract.py
```

Output:

```text
contracts/hear-en-GB.interaction.json
```

Generated shape:

```ts
type HearInteractionContract = {
  version: string;
  sourceHash: string;

  intents: {
    name: string;
    samples: string[];
    slots: {
      name: string;
      type: string;
    }[];
  }[];

  types: {
    name: string;
    values: {
      value: string;
      synonyms: string[];
    }[];
  }[];
};
```

Do not hand-edit the generated contract.

---

## 9. Drift Protection

CI must detect Alexa/Listener language drift.

Process:

```text
hear-py/en-GB.json changes
 -> regenerate contract
 -> run Listener ASR compatibility corpus
 -> fail CI if an existing supported command loses its semantic result
```

Store:

```text
source SHA/hash
generation timestamp
contract schema version
```

The Listener app does not have to bundle every Alexa sample into production.

The generated contract is primarily a **compatibility and regression artifact**.

---

## 10. Characterization Corpus

For every interaction-model sample:

```text
sample utterance
 -> replace slots with representative real fixture values
 -> send through resolver
 -> capture expected semantic result
```

Test fixtures should include:

- creator;
- organization;
- publication;
- category;
- tag;
- location;
- temporal phrases;
- local content;
- recommendation;
- trending;
- general content search.

Example expected result:

```ts
{
  utterance: "play the latest publication from London",
  expected: {
    status: "resolved",
    slots: {
      latest: true,
      isPublication: true
    }
  }
}
```

Do not hard-code only one phrase per intent.

Use the full interaction-model sample corpus.

---

## 11. Slot and Entity Parity

The semantic result must preserve the same concepts currently produced by the resolver:

```text
residualQuery
latest
isLocal
isRecommended
isPublication

category
tags

creatorIds
creatorName

organizationIds
organizationName

publicationIds
publicationName

city
latitude
longitude

temporalOriginal

unresolvedReferences
ambiguousReferences

semanticRoute
semanticScore
searchPlan
```

Listener should consume canonical IDs/results.

Do not re-resolve organization/publication names a second time in React Native after the backend already resolved them.

---

## 12. Ambiguity Must Behave Like the Same Conversation

The resolver can return:

```text
resolved
ambiguous
unresolved
error
```

Listener must treat `ambiguous` as continuation of the same request.

Example:

```text
User:
"Play something from [ambiguous source]"

Resolver:
multiple candidates

Listener:
"Results found ..."

User:
"right"
```

`right` is local and changes the selected returned candidate.

It must **not** turn into a brand-new semantic search.

Voice follow-up can also be local:

```text
first one
second one
next
previous
select
choose it
repeat
cancel
```

The selected alternative keeps the original canonical invocation.

---

## 13. Organization Follow-Up Compatibility

The existing resolver has a dedicated organization follow-up path including handling for short spoken initialisms.

Listener should reuse the resolver's follow-up operation rather than create separate mobile fuzzy behavior.

Example flow:

```text
Resolver:
"Which talking newspaper?"

User:
"Y T N"

Listener:
operation = resolve_organization_follow_up
```

Do not implement a competing acronym matcher in the app.

---

## 14. Screen Context Must Refine, Not Rewrite, Intent Meaning

Screen context is a constraint.

It must not mutate the user's core semantic request.

Example:

```text
Player screen:
"play the latest publication from London"
```

must mean the same content request as it means from Home.

The Player screen may affect:

- whether current audio pauses;
- where result UI opens;
- whether back returns to Player;
- which local commands are available.

It must not change the semantic meaning of:

```text
latest publication from London
```

---

## 15. Feedback Language

Feedback is an app domain flow, not general catalog search.

Listener should recognize deterministic entry phrases locally:

```text
give feedback
give feedback on this
feedback on this track
feedback on this publication
I want to leave feedback
```

Then enter `FeedbackController`.

If Alexa currently supports equivalent feedback wording, keep those phrases accepted as aliases in Listener.

Once feedback capture owns the interaction, phrases such as:

```text
good
bad
yes
no
one
two
three
four
five
cancel
repeat
```

must be interpreted against the feedback state, not sent to content search.

---

## 16. Context Ownership Priority

When a transcript arrives, interpret in this order:

```text
1. safety / cancel
2. active pending interaction
   - ambiguity
   - feedback
   - confirmation
3. screen-local deterministic command
4. universal local command
5. Hear semantic resolver
```

This stops phrases such as:

```text
right
one
yes
next
stop
```

from being sent to the wrong subsystem.

---

## 17. Similar Command Expansion

Listener may support more natural variants than Alexa, but additions must map into existing canonical actions.

Example:

```ts
"carry on"         -> PLAYBACK_RESUME
"keep playing"     -> PLAYBACK_RESUME
"pause it"         -> PLAYBACK_PAUSE

"take me home"     -> NAVIGATE_HOME
"go to my library" -> NAVIGATE_LIBRARY

"choose this one"  -> AMBIGUITY_SELECT
```

Rule:

```text
new phrase
 -> existing canonical action
```

Do not create duplicate actions for synonyms.

---

## 18. Confidence Policy

### Local deterministic command

Execute only when:

- phrase is confidently local;
- action is legal on captured screen;
- pending interaction ownership permits it.

### Semantic request

Do not block natural language because the mobile classifier is uncertain.

Pass it to Hear resolver.

### Remote ambiguous

Open ambiguity.

### Remote unresolved

Give a concise retry prompt.

Do not silently fall back to an unrelated local action.

---

## 19. ASR Error Tolerance

ASR errors should be handled at the correct layer.

### Mobile local commands

Use a small controlled alias table for common transcription variants.

### Semantic content language

Let the resolver correction layer handle vocabulary and entity corrections.

The resolver already learns interaction-model language from `en-GB.json`; maintain that behavior.

Do not create an aggressive mobile autocorrect that could corrupt names such as:

- organizations;
- creators;
- publications;
- cities.

---

## 20. Performance

Target runtime:

```text
native ASR final transcript
 -> local-command decision: near immediate
```

Only then:

```text
PASS_TO_REMOTE
 -> one resolver request
```

Do not:

```text
call resolver
 -> wait
 -> discover it was "pause"
```

Cache only static compatibility data.

Do not download the Alexa interaction model during every voice session.

---

## 21. Telemetry

Record:

```text
asr.raw_transcript
asr.local_match
asr.local_no_match

resolver.request
resolver.status
resolver.intent
resolver.ambiguity_count
resolver.unresolved_count

interaction_model_contract_version
interaction_model_source_hash
```

Privacy:

- production logs should avoid storing unrestricted raw speech indefinitely;
- use redaction/sampling according to product policy.

---

## 22. Required Tests

### Alexa compatibility corpus

For every supported `en-GB.json` semantic sample:

```text
same phrase
 -> still reaches the correct semantic family
```

### Modifier parity

Test:

```text
latest
recent
recommended
near me
local
publication
creator
organization
category
```

### Local interception

Verify zero resolver requests for:

```text
pause
resume
stop
cancel
help
home
back
read screen
left
right
select
```

### Ambiguity

```text
semantic request
 -> ambiguous
 -> right
 -> select
```

Only the first step may call the semantic resolver unless a dedicated semantic follow-up is required.

### Screen independence

Run the same content phrase from:

```text
Home
Discover
Library
Player
```

and verify the semantic resolution is equivalent.

### Resolver compatibility

Verify response handling for:

```text
resolved
ambiguous
unresolved
error
unsupported_version
```

---

## 23. Proposed Files

```text
hear-py/
  en-GB.json

  tools/
    build-listener-interaction-contract.py

  contracts/
    hear-en-GB.interaction.json

hear-listener/
  src/
    voice/
      compatibility/
        InteractionContract.ts
        InteractionContractVersion.ts

      routing/
        LocalCommandRouter.ts
        AlexaParityRequestAdapter.ts
        PendingInteractionRouter.ts

      commands/
        UniversalLocalCommands.ts
        PlaybackLocalCommands.ts
        NavigationLocalCommands.ts
        AmbiguityLocalCommands.ts
        FeedbackLocalCommands.ts

  tests/
    voice/
      alexa-interaction-parity.test.ts
      local-command-routing.test.ts
      resolver-contract.test.ts
      ambiguity-follow-up.test.ts
      screen-semantic-parity.test.ts
```

---

## 24. Migration Plan

### Phase 1 — Freeze Existing Language

Generate a characterization corpus from current `en-GB.json`.

Do this before changing mobile ASR routing.

### Phase 2 — Add Canonical Local Actions

Create one canonical action ID for each mobile/local behavior.

Map synonyms to those IDs.

### Phase 3 — Add Local-First Router

Intercept deterministic local commands before resolver.

### Phase 4 — Add Listener Resolver Adapter

Send raw semantic transcript and context to the existing Hear resolver.

### Phase 5 — Add Pending Interaction Router

Ambiguity/feedback/confirmation owns short follow-up utterances.

### Phase 6 — Add Interaction Contract Generator

Generate compatibility artifact from `en-GB.json`.

### Phase 7 — CI Drift Tests

Any future Alexa interaction-model change must run Listener parity tests.

### Phase 8 — Tune ASR Aliases

Add only evidence-based local transcription aliases.

Do not fork semantic vocabulary from the backend.

---

## 25. Definition of Done

This ASR work is complete when:

- [ ] Alexa `en-GB.json` remains the authoritative Hear semantic interaction language.
- [ ] Existing semantic samples remain accepted by Listener.
- [ ] Listener supports additive mobile-native command phrases.
- [ ] Native/local commands cause zero general resolver calls.
- [ ] Raw semantic ASR transcript reaches the Hear resolver unchanged except transport-safe handling.
- [ ] Listener does not maintain a competing semantic NLU grammar.
- [ ] Creator/organization/publication/category/location/temporal behavior remains resolver-owned.
- [ ] Ambiguity is a continuation of the same request.
- [ ] Organization follow-up uses the existing resolver follow-up operation.
- [ ] Same semantic phrase produces equivalent meaning from every screen.
- [ ] CI detects interaction-model drift.
- [ ] Alexa behavior remains backward compatible.
- [ ] Listener ASR has regression coverage against the interaction-model corpus.

---

## Final Rule

```text
Alexa interaction model defines how users can ask for Hear content.

Listener ASR must understand that same language.

Listener adds app-native commands around it.

It must not replace it.
```
