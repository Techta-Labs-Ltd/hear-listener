# Fix 11 — Voice Performance and Telemetry

## Goal

Make voice feel fast and make every delay measurable.

## Performance Fixes

### Invocation

Do not fetch remote context before opening microphone.

Screen context should already be registered and cached.

### Store Updates

Use small Zustand selectors.

Partial transcript updates must not rerender the whole app.

### Local Commands

Compile normalized phrase maps per screen.

Deterministic actions should be near-instant.

### Resolver

Call remote only after:

```text
LocalCommandRouter -> PASS_TO_REMOTE
```

Send a compact snapshot, not application stores.

### Screen Registration

Use stable memoized capability objects and explicit `stateVersion`.

Avoid expensive serialization-based equality checks.

### Speech

Replace fixed delays with speech completion callbacks/events.

Deduplicate announcements.

### Playback Context

Keep current:

- track ID;
- publication ID;
- playback state;

in a small snapshot available without traversing large stores.

## Telemetry Events

```text
voice.session.started
voice.permission.completed
voice.asr.start_requested
voice.asr.started
voice.asr.first_speech
voice.asr.final_transcript
voice.route.local.completed
voice.route.remote.started
voice.route.remote.completed
voice.ambiguity.opened
voice.command.executed
voice.result.speech_started
voice.session.completed
```

## Key Measurements

### Perceived voice start

```text
voice.session.started -> voice.asr.started
```

### Speech recognition latency

```text
voice.asr.first_speech -> voice.asr.final_transcript
```

### Semantic resolution latency

```text
voice.asr.final_transcript -> resolver result
```

### Action latency

```text
resolved invocation -> visible/audible side effect
```

## Acceptance Checks

- local commands do not wait on network;
- resolver payload is small;
- partial ASR does not rerender unrelated screens;
- each lifecycle delay can be diagnosed from telemetry;
- no arbitrary delay is required for normal success flow.
