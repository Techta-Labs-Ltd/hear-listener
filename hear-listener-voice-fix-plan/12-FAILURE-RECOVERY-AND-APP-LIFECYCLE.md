# Fix 12 — Failure Recovery and App Lifecycle

## Permission Denied

- do not loop permission request;
- ensure microphone is closed;
- give concise settings guidance;
- return to a stable state.

## ASR Start Timeout

If native `start` never arrives:

- never enter `listening`;
- stop/cancel recognizer;
- surface microphone-start error;
- allow clean retry.

## No Speech

Start the 8-second timer only after native START.

If no speech occurs:

- close recognizer once;
- announce timeout once;
- return to idle/retry state.

## User Still Speaking

Speech start cancels pre-speech timer.

Continue while:

- speech activity is present;
- partial/final result activity is still progressing.

Use post-speech silence, not the original pre-speech deadline.

## Remote Timeout

- mark request expired/cancelled;
- ignore later result;
- do not execute stale success.

## Navigation During Resolve

Use the invocation screen snapshot.

If action is context-sensitive and screen is no longer valid, reject it.

## Ambiguity Expired

Clear alternatives and request a new command.

Never execute old selection.

## Feedback Submission Failure

Preserve target and captured response for safe retry.

## Backgrounding

When app backgrounds:

- stop active microphone;
- cancel active ASR session;
- invalidate unsafe requests;
- preserve only safe domain state.

On foreground, create a clean new session rather than resuming microphone capture.

## System Interruption

Notification/call/audio interruption must not allow stale completion to run afterward.

## Acceptance Checks

Every failure ends in one known state with:

- recognizer closed;
- request status known;
- pending domain state either safely retained or deliberately cleared;
- no duplicate side effect.
