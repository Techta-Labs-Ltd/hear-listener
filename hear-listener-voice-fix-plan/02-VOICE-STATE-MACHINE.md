# Fix 02 — Canonical Voice State Machine

## Problem

Flat `phase/message/transcript/choices` state cannot reliably represent permission, microphone startup, screen ownership, routing, ambiguity, execution, cancellation, or stale requests.

UI can drift from native ASR.

## Proposed Fix

Use a discriminated state machine.

```ts
type VoicePhase =
  | { kind: "idle" }
  | { kind: "permission-check"; sessionId: string }
  | { kind: "preparing"; sessionId: string; screenSnapshotId: string }
  | { kind: "opening-microphone"; sessionId: string }
  | {
      kind: "listening";
      sessionId: string;
      openedAt: number;
      preSpeechDeadlineAt: number;
      speechDetected: boolean;
    }
  | { kind: "finalizing-transcript"; sessionId: string }
  | { kind: "routing"; sessionId: string; route: "local" | "remote" }
  | { kind: "ambiguity"; sessionId: string; interactionId: string; selectedIndex: number }
  | { kind: "confirming"; sessionId: string; interactionId: string }
  | { kind: "executing"; sessionId: string; requestId: string }
  | { kind: "speaking-result"; sessionId: string; requestId?: string }
  | { kind: "error"; sessionId?: string; code: string; retryable: boolean }
  | { kind: "cancelled"; sessionId?: string };
```

## Important Timing Rule

```text
VOICE_INVOKE
 -> permission-check
 -> preparing
 -> opening-microphone
 -> native recognizer START
 -> listening
 -> say "Speak now"
 -> start 8 second pre-speech timer
```

If the user starts speaking:

```text
speech-start
 -> cancel pre-speech timeout
 -> keep listening while speech/result activity continues
```

Then finalize only after:

- native final result; or
- explicit stop; or
- configured post-speech silence; or
- safety limit.

## UI Rule

All voice UI is derived from this phase.

Never let a panel independently invent:

- Getting ready;
- Listening;
- Working;
- Results found;
- Error.

## Acceptance Checks

- “Speak now” cannot occur before native START;
- 8-second timeout starts from confirmed microphone open time;
- long speech is not cut off by the pre-speech timer;
- one active phase exists at all times;
- old native callbacks cannot mutate a replacement session.
