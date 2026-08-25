# Voice Feedback

Feedback targets are canonical IDs from the current playback/screen context —
never resolved by comparing a spoken title against hardcoded names.

## Flow

```text
"give feedback" / "feedback on this"
        -> FeedbackVoiceController.startFeedback(target from playback)
"good" / "bad" / "1".."5"
        -> rating state
"send" / "yes"
        -> submit (idempotent via request ledger)
"repeat"
        -> announce current rating
"cancel" / "no"
        -> clear feedback state
```

While feedback is active, rating words are interpreted against the feedback
state and never sent to content search. The `short-response` recognition
profile (Android `web_search`, iOS `confirmation`) applies.

## Data model

```ts
{ kind: "track", trackId, playbackSessionId }
{ kind: "publication", publicationId, playbackSessionId, listenedTrackIds }
```

## Rules

- Raw free-form feedback is sanitized by the shared profanity filter before
  storage; production telemetry never persists unsanitized transcripts.
- Submission deduplication uses the request ledger.
