# Fix 07 — Track and Publication Feedback

## Problem

Feedback must not depend on whichever child track happens to be active at submission time.

A multi-track publication should not accidentally create repeated publication feedback while the user moves between tracks.

## Proposed Target

```ts
type FeedbackTarget =
  | {
      kind: "track";
      trackId: string;
      publicationId?: string;
      playbackSessionId: string;
    }
  | {
      kind: "publication";
      publicationId: string;
      playbackSessionId: string;
      listenedTrackIds: string[];
    };
```

Create the target **when feedback begins**.

Do not rebuild it from current playback state during submission.

## Feedback State

```text
idle
 -> prompting
 -> capturing
 -> confirming (optional)
 -> submitting
 -> success | error
```

## Dedupe Key

```ts
const key =
  `${userId}:${playbackSessionId}:${target.kind}:${targetId}`;
```

Publication and track feedback therefore cannot collide.

## Rules

### Independent Track

One track-level submission per eligible listening episode unless the product explicitly supports editing.

### Publication

One publication-level feedback submission per eligible publication/listening episode.

Switching child tracks does not create a new publication feedback target.

### Track Inside Publication

If product policy allows track feedback too, it remains a different target and ledger key.

## Failed Submission

If API submit fails:

- preserve target;
- preserve captured answer;
- allow safe retry;
- do not force user to answer again unless the stored response is invalid.

## Voice Integration

Deterministic feedback phrases are local:

- positive/negative;
- rating selection;
- cancel;
- repeat.

Only the feedback submission API call is remote.

## Acceptance Checks

- publication with 5 child tracks => one publication feedback receipt;
- child track changes do not redirect feedback;
- track feedback and publication feedback use different keys;
- retry does not double-submit.
