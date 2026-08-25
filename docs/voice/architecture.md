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

recognition-dictionary (src/services/voice/recognition-dictionary.ts)
  local command dictionary, filler phrases, bias-term ranking

pending-interaction-router (src/services/voice/pending-interaction-router.ts)
  ambiguity / feedback / confirmation input ownership

local-command-router (src/services/voice/local-command-router.ts)
  deterministic app/device commands, zero resolver calls

asr-hypotheses + transcript-preparation + profanity-filter
  transcript sanitization before routing

semantic-parser (src/services/voice/matching/semantic-parser.ts)
  generic command/modifier/relation grammar

resolver (src/services/voice/resolver.ts)
  pure orchestrator; returns resolved / ambiguous / unresolved

repository (src/services/voice/repository.ts)
  sole SQLite boundary: exact + FTS5 + trigram + phonetic

ambiguity-controller / feedback-controller / executor
  canonical-ID interaction state and execution
```

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
PENDING INTERACTION -> LOCAL COMMAND -> SEMANTIC RESOLVER
      |
      v
resolved / ambiguous / unresolved
```

## State machine

Voice session state (interaction): `idle -> preparing -> listening -> resolving -> clarifying -> executing -> success/error/cancelled`.

Separate stores that must not be conflated:

- `voice-store` — interaction state (session, transcript, choices)
- `speech-capability-store` — device capability state (platform, permission state, Android model state)
- `ambiguity-controller` — pending canonical candidates
- `feedback-controller` — active feedback target

## 8-second invariant

The 8-second timer (`VOICE_TIMING.preSpeechTimeout`) starts only after the
native recognizer reports `start`. Speech start cancels it permanently.
A separate absolute guard (`VOICE_TIMING.recognitionActivityWatchdog`, 45s)
protects against a stuck recognizer; it is reset on speech activity.

See [architecture.md](./architecture.md) details and [testing.md](./testing.md).
