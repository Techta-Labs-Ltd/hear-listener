# Fix 14 — Current Code Change Checklist

Use this file as the direct implementation checklist against the current project.

## `src/providers/VoiceProvider.tsx`

- [ ] Remove onboarding-specific branch.
- [ ] Stop setting `listening` before native ASR `start`.
- [ ] Delegate lifecycle to `VoiceSessionEngine`.
- [ ] Delegate local/remote decision to routing layer.
- [ ] Ignore callbacks not matching active `sessionId`.

## Voice context / registration hook

- [ ] Register stable `ScreenVoiceCapability`.
- [ ] Include `localCommands`.
- [ ] Include `remoteCapabilities`.
- [ ] Include `resolverContext`.
- [ ] Include `activeEntity`.
- [ ] Include screen `phase`.
- [ ] Include `stateVersion`.
- [ ] Include `instanceId`.

## `src/stores/voice-store.ts`

Either expand it or add `interaction-store.ts`.

Must contain:

- [ ] canonical phase;
- [ ] session ID;
- [ ] native mic state;
- [ ] captured screen snapshot;
- [ ] pending ambiguity;
- [ ] pending feedback;
- [ ] active request ID;
- [ ] transition timestamps;
- [ ] latest receipts/ledger references.

## `src/types/voice.ts`

- [ ] Split runtime voice types from domain actions.
- [ ] Move onboarding actions into onboarding feature.
- [ ] Create typed interaction events.
- [ ] Create typed screen capabilities.

## `src/services/voice/resolver.ts`

- [ ] Local-first boundary is explicit.
- [ ] Return `PASS_TO_REMOTE` instead of implicit fallback.
- [ ] Never send device/native commands remotely.
- [ ] Normalize remote result shape.

## `src/services/voice/executor.ts`

- [ ] Add middleware pipeline.
- [ ] Add persisted request ledger.
- [ ] Keep serialization.
- [ ] Validate screen snapshot freshness.
- [ ] Commit receipt before success announcement.

## `src/services/voice/screen-registry.ts`

- [ ] Remove unrestricted Home catch-all.
- [ ] Safe fallback only.
- [ ] Fail visibly in development when a screen should have registered but did not.

## Voice UI

- [ ] Render purely from canonical phase.
- [ ] Add `opening-microphone`.
- [ ] Add explicit `routing`.
- [ ] Add ambiguity state.
- [ ] Add executing state.
- [ ] Do not infer lifecycle from unrelated booleans.

## `KineticProvider`

- [ ] Emit typed events.
- [ ] Add debounce/hysteresis.
- [ ] Do not directly mutate voice state.
- [ ] Respect interaction ownership.

## Feedback

- [ ] Create `FeedbackTarget` at flow entry.
- [ ] Separate publication vs track ledger keys.
- [ ] Prevent duplicate publication feedback across child tracks.

## Speech / Accessibility

- [ ] Introduce speech coordinator.
- [ ] Quiet non-essential TTS during active capture.
- [ ] Deduplicate TalkBack/VoiceOver vs app TTS.
- [ ] Key screen announcements by instance/version.

## Telemetry

- [ ] Record native ASR requested/start.
- [ ] Record first speech.
- [ ] Record final transcript.
- [ ] Record local/remote resolution.
- [ ] Record execution.
- [ ] Record result speech.
