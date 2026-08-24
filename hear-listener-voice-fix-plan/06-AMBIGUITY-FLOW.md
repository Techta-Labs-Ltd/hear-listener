# Fix 06 — Ambiguity Interaction

## Problem

Ambiguity cannot be only a list of `choices` in voice UI state. It needs ownership, selection index, expiry, request identity, and safe execution.

## Proposed State

```ts
type PendingAmbiguity = {
  interactionId: string;
  sessionId: string;
  requestId: string;
  alternatives: {
    id: string;
    label: string;
    invocation: CanonicalInvocation;
    confidence?: number;
  }[];
  selectedIndex: number;
  createdAt: number;
  expiresAt: number;
};
```

## Flow

```text
resolver returns 2..N results
 -> create PendingAmbiguity
 -> show AmbiguityPanel
 -> announce result-found instructions
 -> selectedIndex = 0
```

Left/right swipe or tilt:

```text
SELECT_PREVIOUS / SELECT_NEXT
 -> update selectedIndex locally
 -> announce selected item
 -> NO resolver call
```

Select:

```text
CONFIRM_SELECTION
 -> validate interaction is current
 -> validate request freshness
 -> execute stored canonical invocation
 -> clear ambiguity
```

Cancel:

```text
CANCEL
 -> clear pending ambiguity
 -> return to previous stable state
```

New voice invocation while ambiguity is open:

```text
cancel old ambiguity
 -> start new voice session
```

## Accessibility

Expose:

- current option label;
- position e.g. “2 of 4”;
- next/previous actions;
- select action;
- close/cancel action.

Do not create an inaccessible focus trap.

## Expiry

After TTL:

- clear alternatives;
- never execute them;
- ask user to make the request again.

## Acceptance Checks

- swiping/tilting never re-calls resolver;
- stale ambiguity cannot execute;
- new voice invocation replaces the old ambiguity cleanly;
- selection is accessible through speech and accessibility actions.
