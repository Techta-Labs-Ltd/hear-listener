# Fix 09 — Shake, Tilt, Swipe and Native Interaction Bus

## Problem

Native gestures must participate in the same app interaction state as voice without pretending to be voice transcripts.

Gesture meaning also changes according to what currently owns interaction.

## Proposed Event Model

```ts
type InteractionEvent =
  | {
      type: "VOICE_INVOKE";
      source: "shake" | "accessibilityAction" | "button";
    }
  | {
      type: "SELECT_PREVIOUS";
      source: "tilt-left" | "swipe-left";
    }
  | {
      type: "SELECT_NEXT";
      source: "tilt-right" | "swipe-right";
    }
  | {
      type: "CONFIRM_SELECTION";
      source: "double-tap" | "voice" | "accessibilityAction";
    }
  | {
      type: "CANCEL";
      source: string;
    };
```

## Adapter

`KineticProvider` should only:

- subscribe to native sensors;
- debounce/hysteresis events;
- convert native events to `InteractionEvent`;
- dispatch into `InteractionController`.

It must **not** directly mutate voice UI state.

## Gesture Ownership

The interaction controller decides ownership.

Example priority:

```text
active ambiguity
  > active feedback selector
  > active modal/list selector
  > player
  > default screen
```

This prevents tilt-right from changing tracks while ambiguity is active.

## TalkBack/VoiceOver Compatibility

Do not rely solely on gestures screen readers may consume.

Every important gesture must have an equivalent:

- accessibility action;
- spoken command; or
- visible control.

## Sensor Safety

Use:

- debounce;
- minimum tilt threshold;
- hysteresis;
- cooldown;
- cancellation on app background;
- no repeated command from one continuous tilt.

## Acceptance Checks

- one physical gesture produces one logical event;
- ambiguity owns left/right while active;
- kinetic event never calls resolver;
- TalkBack user has an equivalent accessible action.
