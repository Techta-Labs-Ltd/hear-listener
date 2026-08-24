# Hear! Listener — Voice Access Robust Fix Plan

## Goal

Rebuild voice access as one reliable app-wide interaction system for visually impaired users.

The global voice layer must know **when voice is active**, **which screen owns the request**, **what the screen is doing**, **which commands are local**, **when the resolver is allowed**, **what interaction is pending**, and **whether an old request is still safe to execute**.

## Final Architecture

```text
Accessible gesture / button / shake
        |
        v
VoiceSessionEngine
        |
        +--> ScreenVoiceCapability snapshot
        |
        +--> Native ASR lifecycle
        |
        +--> LocalCommandRouter ----------> local action
        |
        +--> RemoteResolverAdapter -------> semantic content result
        |
        +--> InteractionController
                 |
                 +--> AmbiguityController
                 +--> FeedbackController
                 +--> OnboardingVoiceController
                 +--> Player commands
        |
        v
Validation Middleware
        |
        v
CommandExecutor
        |
        v
RequestLedger
        |
        v
SpeechCoordinator / accessibility announcement
```

## Non-negotiable Rules

1. One global microphone/ASR owner.
2. `VoiceProvider` remains global but contains no onboarding, feedback, ambiguity, or screen-specific business logic.
3. UI never shows **Listening** before the native recognizer confirms `start`.
4. “Speak now” is announced only after native microphone start confirmation.
5. User gets an 8-second pre-speech window from confirmed microphone open time.
6. Once speech starts, the original 8-second timer cannot end the session.
7. Local navigation, playback, screen reading, selection gestures, shake, tilt, cancel, and help never call the resolver.
8. Every voice invocation snapshots screen identity + state version.
9. Old/stale requests cannot execute against a new screen state.
10. Ambiguity is a first-class pending interaction.
11. Feedback is a first-class pending interaction.
12. Publication feedback and track feedback use different dedupe keys.
13. Loading, empty, ready, error, and modal states are voice-visible states.
14. TalkBack/VoiceOver and app TTS must not speak duplicate messages.
15. Every side effect gets an idempotency key and completion receipt.

## Implementation Order

### Phase 1 — Stabilize ASR lifecycle
Implement `VoiceSessionEngine`, canonical phases, native-start-only listening, 8-second floor, and post-speech silence logic.

### Phase 2 — Thin the provider
Remove onboarding and domain branches from `VoiceProvider`. Provider becomes React wiring around the engine and store.

### Phase 3 — Screen capability registry
Make every screen register voice capability, phase, legal local actions, remote capability, active entity, and `stateVersion`.

### Phase 4 — Local vs remote routing
Build explicit `LocalCommandRouter` and `RemoteResolverAdapter`.

### Phase 5 — Pending interactions
Implement Ambiguity and Feedback controllers.

### Phase 6 — Request safety
Add request ledger, stale-screen validation, idempotency, cancellation, and retry relationships.

### Phase 7 — Native gesture bus
Route shake/tilt/swipe/select into typed `InteractionEvent`s.

### Phase 8 — Accessibility + speech coordination
Centralize announcements and quiet mode.

### Phase 9 — Performance + telemetry
Measure every lifecycle boundary and remove fixed waits/unnecessary rerenders.

### Phase 10 — Regression
Test TalkBack/VoiceOver, offline behavior, navigation, interruption, feedback dedupe, ambiguity, long speech, and resolver call boundaries.

## Proposed Folder Layout

```text
src/
  components/voice/
    GlobalVoiceDock.tsx
    VoicePhasePanel.tsx
    AmbiguityPanel.tsx
    FeedbackVoicePanel.tsx

  providers/
    VoiceProvider.tsx
    KineticProvider.tsx

  voice/
    runtime/
      VoiceSessionEngine.ts
      RecognitionAdapter.ts
      VoiceTiming.ts

    routing/
      LocalCommandRouter.ts
      RemoteResolverAdapter.ts
      CommandPolicy.ts

    interaction/
      InteractionController.ts
      RequestLedger.ts
      GestureRouter.ts

    screen/
      ScreenVoiceRegistry.ts
      useScreenVoiceContext.ts

  features/
    onboarding/voice/OnboardingVoiceController.ts
    ambiguity/voice/AmbiguityController.ts
    feedback/voice/FeedbackVoiceController.ts
    player/voice/PlayerVoiceCapability.ts

  stores/
    interaction-store.ts
    playback-store.ts

  types/
    voice-session.ts
    interaction.ts
    screen-voice.ts
    feedback.ts
```

## Completion Definition

The refactor is complete only when:

- no onboarding branch exists in the global provider;
- no UI enters listening before native ASR start;
- local/native commands produce zero resolver network calls;
- screen state is snapshotted and validated;
- ambiguity navigates locally;
- publication feedback submits once per eligible listening episode;
- old requests cannot execute after screen replacement;
- TalkBack/VoiceOver speech does not conflict with app TTS;
- lifecycle timing is observable;
- all critical flows pass regression tests.
