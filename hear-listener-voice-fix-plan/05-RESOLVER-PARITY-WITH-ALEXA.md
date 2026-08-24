# Fix 05 — Listener Resolver Parity with Alexa

## Goal

Listener and Alexa should understand semantic content requests the same way without copying Alexa-specific code into the mobile app.

## Share

Share the conceptual resolver contract:

- normalized transcript;
- locale;
- user context;
- location context;
- canonical content entities;
- filters;
- confidence;
- ambiguity alternatives;
- session/request identifiers.

For the same semantic content request, Alexa and Listener should produce equivalent resolver input.

## Keep Alexa-Specific

Do not port:

- Alexa intent handlers;
- slots;
- directives;
- AudioPlayer events;
- Alexa session transport.

## Keep Listener-Specific

Listener owns:

- current screen snapshot;
- local navigation;
- playback control;
- accessibility actions;
- shake/tilt/swipe;
- TalkBack/VoiceOver;
- visual ambiguity cursor;
- offline/local command routing.

## Adapter

```text
src/voice/routing/RemoteResolverAdapter.ts
```

Responsibilities:

1. build compact resolver request;
2. call resolver once;
3. normalize response;
4. attach original `requestId/sessionId`;
5. reject malformed or stale results;
6. return one of:

```ts
type RemoteResolution =
  | { kind: "resolved"; invocation: CanonicalInvocation }
  | { kind: "ambiguity"; alternatives: Alternative[] }
  | { kind: "unrecognized" }
  | { kind: "error"; code: string };
```

## Acceptance Checks

- semantic requests are compatible with the canonical resolver model;
- Alexa device commands do not leak into Listener;
- Listener native commands never reach the resolver;
- ambiguity alternatives have stable IDs and canonical invocations.
