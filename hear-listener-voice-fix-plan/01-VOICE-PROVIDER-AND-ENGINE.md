# Fix 01 — Global Voice Provider and Voice Session Engine

## Problem

`VoiceProvider` currently owns too many responsibilities. It handles microphone lifecycle, routing, executor work, UI state, and onboarding-specific behavior.

This makes global state fragile and encourages every future feature to add another branch.

## Proposed Fix

Keep `VoiceProvider` global, but make it thin.

Move runtime logic to:

```text
src/voice/runtime/VoiceSessionEngine.ts
```

`VoiceProvider.tsx` should only:

- create/provide the engine;
- subscribe React UI to interaction state;
- expose public commands such as `invokeVoice()`, `cancelVoice()`;
- connect native lifecycle events;
- clean up the engine on app lifecycle changes.

It must not know:

- onboarding steps;
- feedback targets;
- ambiguity options;
- player-specific commands;
- screen-specific routing rules.

## Engine Responsibilities

```ts
interface VoiceSessionEngine {
  invoke(source: VoiceInvokeSource): Promise<void>;
  cancel(reason: CancelReason): void;
  handleNativeStart(): void;
  handleSpeechStart(): void;
  handlePartial(text: string): void;
  handleFinal(text: string): void;
  handleNativeEnd(): void;
  handleNativeError(error: RecognitionError): void;
}
```

The engine owns:

- one active session;
- native recognizer start/stop;
- permission flow;
- timing;
- transcript assembly;
- cancellation;
- screen snapshot;
- local/remote routing entry;
- speech quiet mode.

## Critical Code Change

Do **not** set:

```ts
state = "listening"
```

inside `beginRecognition()` before the native recognizer has emitted its start event.

Instead:

```text
preparing
  -> opening-microphone
  -> native START
  -> listening
```

## Acceptance Checks

- `VoiceProvider` contains no `onboardingPractice` branch.
- only native recognition `start` can transition to `listening`;
- exactly one session owns ASR;
- cancellation closes the recognizer once;
- app backgrounding cancels active capture;
- late events from an old session are ignored.
