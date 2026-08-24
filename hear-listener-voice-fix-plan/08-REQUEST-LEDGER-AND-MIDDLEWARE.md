# Fix 08 — Request Ledger, Idempotency and Validation

## Problem

An in-memory completed-request map is not enough for navigation, screen recreation, retries, app reload, or delayed network responses.

## Proposed Receipt

```ts
type InteractionReceipt = {
  requestId: string;
  sessionId: string;
  idempotencyKey: string;

  origin: {
    screenId: string;
    instanceId: string;
    stateVersion: number;
    routeKey: string;
  };

  actionId: string;
  status: "completed" | "failed" | "cancelled";

  startedAt: number;
  completedAt: number;

  retryOf?: string;

  navigation?: {
    from: string;
    to: string;
    returnRoute?: string;
  };

  resultEntityId?: string;
};
```

Persist a bounded history:

- 20–50 receipts; or
- short TTL.

Use AsyncStorage, MMKV, or SQLite depending on existing app persistence.

## Middleware Order

1. **Session freshness**  
   Reject stale/cancelled session.

2. **Screen capability**  
   Reject command not legal on captured screen.

3. **Pending interaction ownership**  
   Ambiguity/feedback may own current input.

4. **Idempotency**  
   Do not repeat completed side effect.

5. **Connectivity**  
   Reject remote-only operation while offline.

6. **Playback/content validity**  
   Ensure target still exists and is valid.

7. **Risk/confirmation**  
   Require confirmation where necessary.

8. **Execution serialization**  
   Prevent overlapping side effects.

9. **Receipt commit**  
   Commit completion/failure before final success speech.

## Navigation Rule

A command can intentionally navigate away.

Its receipt remains history, but old origin context is no longer executable.

When returning, the screen gets a new `instanceId`.

## Retry Rule

Retry creates:

```ts
retryOf: oldRequestId
```

but still follows idempotency validation.

Never blindly replay the last command.

## Acceptance Checks

- command that navigates cannot execute twice;
- delayed resolver response from a cancelled session is ignored;
- app knows last completed request after navigation/return;
- retry relationships are traceable;
- success is committed before it is announced.
