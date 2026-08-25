# Ambiguity

When the resolver cannot confidently pick one canonical entity, it returns
`choices` with canonical candidates (entity type + id + canonical name +
score). The ambiguity controller stores these candidates; selection is local.

## Interaction

```text
"play something from [ambiguous source]"
        -> choices: Results found ...
"right"       -> move selection (local, zero resolver calls)
"left"        -> move selection back
"select"      -> execute the stored canonical invocation
"first one"   -> select by ordinal
"repeat"      -> re-announce options
"cancel"      -> clear the pending interaction
```

Ownership order for every transcript (pending-interaction-router first):

```text
1. safety / cancel
2. active pending interaction (ambiguity / feedback / confirmation)
3. screen-local deterministic command
4. universal local command
5. Hear semantic resolver
```

Tilt left/right (kinetic gestures) also drive selection while the store is
`clarifying`.

## Short-response recognition profile

While ambiguity is pending, the next recognition uses the `short-response`
profile (Android `web_search`, iOS `confirmation`), selected before the user
speaks from interaction state.

## Rules

- Selection changes only `selectedIndex`; it never re-runs the resolver.
- The selected alternative keeps the original canonical invocation.
- Ambiguity is a continuation of the same request, never a brand-new search.
