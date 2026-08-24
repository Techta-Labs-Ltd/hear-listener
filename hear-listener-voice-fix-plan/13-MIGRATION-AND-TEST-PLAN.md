# Fix 13 — Migration and Regression Plan

## Migration Sequence

### 1. Stabilize lifecycle
- add canonical phases;
- native-start-only listening;
- 8-second floor;
- transition logging.

### 2. Extract runtime
- create `VoiceSessionEngine`;
- make provider thin;
- remove onboarding branch.

### 3. Screen capability
Migrate first:

- Home;
- Player;
- Discover;
- Library;
- Settings.

Then migrate remaining screens.

### 4. Explicit router
- local command router;
- remote resolver adapter;
- network spy tests.

### 5. Ambiguity
- `PendingAmbiguity`;
- selection cursor;
- local swipe/tilt/select;
- expiry.

### 6. Feedback
- typed target;
- track/publication dedupe;
- safe retry.

### 7. Request ledger
- persisted bounded receipts;
- stale-screen middleware;
- retry relationships.

### 8. Resolver parity
- normalize Listener resolver envelope with Alexa semantic contract.

### 9. Performance
- selectors;
- memoized capability registration;
- remove fixed sleeps;
- telemetry.

### 10. Accessibility
- TalkBack;
- VoiceOver;
- gesture conflicts;
- permission flow;
- announcement dedupe.

## Required Regression Tests

### Voice startup
- permission already granted;
- first-run permission;
- native start delay;
- native start failure.

### Timing
- no speech for 8s;
- long speech;
- post-speech pause;
- safety length cap.

### Local routing
Network resolver must receive zero calls for:

- pause;
- resume;
- next;
- previous;
- back;
- read screen;
- ambiguity selection;
- native tilt/shake handling.

### Remote routing
Semantic content request calls resolver once.

### Navigation
Command leaves screen and returns.

Old request cannot execute twice.

### Ambiguity
Three results:

- left/right cycles locally;
- select executes stored result;
- no re-query.

### Feedback
Publication with multiple tracks:

- publication feedback submits once;
- track feedback uses separate key.

### Loading
Loading screen readout is correct.

Content-only actions are rejected/queued according to policy.

### Accessibility
TalkBack/VoiceOver enabled:

- no duplicate announcements;
- all essential interaction has accessible alternative.

### Interruptions
- app background/foreground;
- notification/system interruption;
- cancellation during remote resolve.

Late success must not execute.

### Offline
- local commands work;
- remote semantic request receives safe offline response.

## Definition of Done

Do not merge the complete refactor until all critical acceptance tests are automated or reproducibly documented.
