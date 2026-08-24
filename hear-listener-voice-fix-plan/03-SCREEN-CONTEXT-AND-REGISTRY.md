# Fix 03 — Screen Voice Context and Registry

## Problem

The voice system needs to understand the current screen, but screen registration can become stale when legal actions, active content, resolver context, or loading state changes.

A catch-all Home fallback can also hide missing registrations.

## Proposed Fix

Every screen registers a complete capability object.

```ts
type ScreenVoiceCapability = {
  screenId: string;
  routeKey: string;
  instanceId: string;
  stateVersion: number;

  phase: "loading" | "ready" | "empty" | "error" | "modal";

  title: string;
  readout: () => string;

  localCommands: LocalCommandId[];
  remoteCapabilities: RemoteCapabilityId[];

  resolverContext: ResolverScreenContext;

  activeEntity?: {
    kind: "track" | "publication" | "topic";
    id: string;
    title?: string;
  };

  voiceEnabled: boolean;
  disabledReason?: string;
};
```

## Screen Identity

`instanceId` changes when a new screen instance is created.

`stateVersion` increments whenever the meaning of commands changes, including:

- loading -> ready;
- active track changes;
- publication changes;
- selected item changes;
- legal command set changes;
- modal opens/closes;
- resolver context changes.

## Invocation Snapshot

At voice invocation:

```ts
const snapshot = {
  screenId,
  routeKey,
  instanceId,
  stateVersion,
  localCommands,
  remoteCapabilities,
  resolverContext,
  activeEntity,
  phase,
};
```

The request uses this immutable snapshot.

## Safe Fallback

If no screen registered, expose only universal safe commands:

- cancel;
- help;
- read screen;
- back when valid.

Do **not** silently treat the screen as Home.

## Loading States

A loading screen is real voice state.

Example:

```text
User: "Read this screen"
App: "Your publications are still loading."
```

Content-dependent commands should be rejected or explicitly queued according to screen policy.

## Acceptance Checks

- every major route registers capability;
- registration updates when `stateVersion` changes;
- stale screen-dependent results are rejected;
- missing registrations do not inherit Home commands.
