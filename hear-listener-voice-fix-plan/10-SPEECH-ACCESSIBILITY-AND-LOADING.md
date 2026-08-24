# Fix 10 — TTS, TalkBack/VoiceOver and Loading State

## Problem

For a visually impaired app, speech is part of core state. App TTS, TalkBack/VoiceOver, microphone capture, loading announcements, and system permission prompts cannot operate independently.

## Proposed Speech Coordinator

```text
src/services/voice/SpeechCoordinator.ts
```

Responsibilities:

- serialize announcements;
- deduplicate by speech key;
- quiet/cancel non-essential TTS before capture;
- select app TTS vs native accessibility announcement;
- signal completion instead of relying on fixed sleeps;
- suppress stale announcements.

## Quiet Mode

Before microphone capture:

```text
stop/suspend non-critical speech
 -> request recognizer start
 -> native START
 -> announce short "Speak now"
 -> no competing speech while user talks
```

Avoid app speech while ASR is actively accepting speech.

## Permission Dialog

If explanation is needed:

```text
speak explanation
 -> wait for speech completion
 -> open OS permission prompt
```

Do not continue talking into the microphone capture lifecycle.

## Screen Speech Keys

Key automatic screen readouts by:

```text
screen instanceId + stateVersion + announcement type
```

This prevents React rerenders from repeating the same speech.

## Loading

Every screen exposes:

```text
loading | ready | empty | error | modal
```

Examples:

- loading: “Your publications are loading.”
- ready delta: “12 publications loaded.”
- empty: “No saved publications.”
- error: concise error + available local action.

Do not reread the entire screen whenever loading completes unless requested.

## Screen Reader Policy

When TalkBack/VoiceOver is active, choose one announcement owner for each message.

Do not announce the exact same result through both app TTS and accessibility API.

## Acceptance Checks

- no duplicate TalkBack + app TTS;
- no non-essential TTS while user is speaking;
- loading is announced once per meaningful state change;
- permission explanation does not overlap capture;
- fixed success sleeps are removed where event completion is available.
