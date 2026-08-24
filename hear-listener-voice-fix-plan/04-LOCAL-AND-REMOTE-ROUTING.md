# Fix 04 — Local Commands vs Remote Resolver

## Problem

The app already attempts local resolution before external resolution, but the policy needs to be explicit and enforceable.

Native/device commands should never cost network latency or depend on backend availability.

## Proposed Fix

Use one routing boundary:

```ts
const local = localCommandRouter.resolve({
  transcript,
  screenSnapshot,
  pendingInteraction,
});

if (local.kind === "execute") {
  return executor.execute(local.invocation);
}

if (local.kind === "interaction") {
  return interactionController.handle(local.event);
}

if (local.kind === "reject") {
  return speechCoordinator.say(local.reason);
}

return remoteResolver.resolve(
  buildResolverRequest(transcript, screenSnapshot)
);
```

## Always Local

- cancel voice;
- stop listening;
- help;
- read this screen;
- back;
- home;
- open settings;
- open library;
- open discover;
- pause;
- resume;
- next;
- previous;
- seek;
- speed;
- ambiguity left/right/select/repeat;
- deterministic feedback selection;
- shake/tilt interaction events.

## Remote Resolver

Use remote resolver for semantic catalog/domain understanding such as:

- “play the latest publication from London”;
- “find stories about transport”;
- “play [publication name]”;
- “play another publication like this”.

## Network Contract

The mobile client should send:

```ts
{
  transcript,
  locale,
  sessionId,
  requestId,
  locationContext,
  resolverContext,
  activeEntity,
  allowedCapabilities
}
```

Do not send React/Zustand stores or app-only presentation state.

## Offline Rule

Offline:

- all local commands continue to work;
- remote-only request gives a concise offline-safe response;
- do not retry endlessly.

## Acceptance Checks

Use a network spy:

- pause/resume/back/read screen => 0 resolver calls;
- ambiguity navigation => 0 resolver calls;
- semantic search => exactly 1 resolver call;
- late resolver results cannot execute after cancellation.
