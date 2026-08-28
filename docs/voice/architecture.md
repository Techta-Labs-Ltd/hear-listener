# Voice Architecture

## Components

```text
VoiceProvider (src/providers/VoiceProvider.tsx)
  owns the voice session lifecycle

speech-recognition-bootstrap (src/services/voice/speech-recognition-bootstrap.ts)
  capability detection + permission gate

speech-model-manager (src/services/voice/speech-model-manager.ts)
  Android 13+ en-GB offline model state machine

recognition-profile (src/services/voice/recognition-profile.ts)
  purpose -> platform-specific recognition options

voice-dictionary + recognition-dictionary
  immutable command/filler config in constants + pure bias ranking in utils

pending-interaction-router (src/services/voice/pending-interaction-router.ts)
  ambiguity / feedback / confirmation input ownership

local-command-router (src/services/voice/local-command-router.ts)
  local-first orchestration; deterministic matching lives in
  src/utils/voice/local-command-matcher.ts

asr-hypotheses + transcript-preparation + profanity-filter
  transcript sanitization before routing

semantic-parser (src/utils/voice/matching/semantic-parser.ts)
  generic command/modifier/relation grammar

external-transcript-preparer
  high-confidence SQLite canonicalisation without local content execution

external-resolver + external-voice-store
  typed resolver + Hear search client (src/services/voice/external-resolver-service.ts)
  + Zustand-owned request and in-memory interaction state

external-interaction
  pure ambiguity/confirmation transition functions

external-voice types + constants
  shared API/dialogue contracts in src/types/external-voice.ts;
  endpoint, expiry, installation, and phrase data in src/constants

voice-repository (src/services/voice/voice-repository.ts)
  sole SQLite boundary: exact + FTS5 + trigram + phonetic

ambiguity-store / feedback-voice-store + controllers / executor
  observable interaction state with side effects kept in services
```

## Source ownership

- `src/constants` owns immutable dictionaries, intent sets, and resolver tuning.
- `src/utils/voice` owns deterministic text, matching, ranking, and playback
  transformations. Utilities do not import React Native or Expo runtime APIs.
- `src/services/voice` owns native capabilities, persistence, network, speech,
  routing orchestration, and side-effect controllers.
- `src/stores` owns observable cross-component state. Store actions remain pure;
  native feedback and network effects stay in services and providers.
- `src/types` owns exported domain and boundary contracts. Service modules do
  not declare parallel API, persistence, or routing types.
- `src/navigation` owns the screen registry and route metadata.

## Flow

```text
VOICE INVOCATION
      |
      v
CAPABILITY CHECK (detectPlatformSpeechCapabilities)
      |
      v
PERMISSION GATE (ensureVoicePermissions)
      |
      v
MODEL / SERVICE CHECK (speech-model-manager on Android)
      |
      v
BUILD RECOGNITION PROFILE (recognition-profile)
      |
      v
OPEN MICROPHONE -> NATIVE READY -> "SPEAK NOW"
      |
      v
8-SECOND PRE-SPEECH WINDOW
      |
      v
ASR ALTERNATIVES (max 5)
      |
      v
SANITIZE (profanity + fillers)
      |
      v
PENDING INTERACTION -> LOCAL COMMAND -> FTS5 PREPARATION
      |
      v
EXTERNAL RESOLVER -> AMBIGUITY -> CONFIRMATION -> HEAR SEARCH -> PLAYBACK
```

## State machine

Voice session state (interaction): `idle -> preparing -> listening -> resolving -> clarifying -> executing -> success/error/cancelled`.

Separate stores that must not be conflated:

- `voice-store` — interaction state (session, transcript, choices)
- `external-voice-store` — non-persisted API status, typed response, local
  interaction expiry, and invalid-answer state
- `speech-capability-store` — device capability state (platform, permission state, Android model state)
- `ambiguity-store` — pending canonical candidates and selected option
- `feedback-voice-store` — active feedback target and rating

## 8-second invariant

The 8-second timer (`VOICE_TIMING.preSpeechTimeout`) starts only after the
native recognizer reports `start`. Speech start cancels it permanently.
A separate absolute guard (`VOICE_TIMING.recognitionActivityWatchdog`, 45s)
protects against a stuck recognizer; it is reset on speech activity.

See [testing.md](./testing.md) for the corresponding verification strategy.
