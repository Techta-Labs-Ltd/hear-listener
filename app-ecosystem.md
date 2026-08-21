# Hear! Listener — Global ASR, Voice Access & Resolver Flow Specification

## 1. Purpose

This document defines how voice recognition works across the entire Hear! Listener application.

ASR must be a **global application service**.

It must not belong to individual screens.

The same voice system must work from:

- Home;
- Discover;
- Library;
- Player;
- Search;
- Settings where appropriate;
- content detail screens;
- programme screens;
- modal screens;
- onboarding;
- future Hear screens.

The system must support:

- microphone management;
- ASR;
- current-screen awareness;
- local application commands;
- external resolver commands;
- playback;
- content discovery;
- feedback;
- ambiguity/clarification;
- cancellation;
- errors;
- TalkBack/VoiceOver;
- the global voice overlay.

---

# 2. Main Architecture

```text
                    USER
                      │
         ┌────────────┼────────────┐
         │            │            │
      Gesture       Touch        Voice
         │            │            │
         └────────────┼────────────┘
                      │
                      ▼
              VOICE PROVIDER
                      │
          ┌───────────┼───────────┐
          │           │           │
     Screen Context   │      Voice Overlay
                      │
                      ▼
                GLOBAL ASR
                      │
                      ▼
                 TRANSCRIPT
                      │
                      ▼
              COMMAND ROUTER
                 /         \
                /           \
       LOCAL COMMAND       EXTERNAL
                          RESOLVER
                              │
                              ▼
                       RESOLVED ACTION
                              │
                              ▼
                          EXECUTOR
                              │
             ┌────────────────┼────────────────┐
             │                │                │
         Playback         Feedback        Navigation/
          Service          Service          Other
             │                │                │
             └────────────────┼────────────────┘
                              │
                              ▼
                         APP STATE
                              │
                              ▼
                   SPEECH + HAPTIC + UI
```

---

# 3. Core Principle

There must be:

```text
ONE VoiceProvider

ONE ASR service

ONE active ASR session

ONE global voice overlay
```

There must not be:

```text
HomeASR

PlayerASR

DiscoverASR

OnboardingASR
```

Screens request voice access through the provider.

---

# 4. Responsibilities

## VoiceProvider

The provider orchestrates:

```text
voice session lifecycle

active screen context

permission status

ASR start/stop

transcripts

resolver requests

clarification

execution

voice overlay state

TTS coordination

haptics

cancellation

errors
```

It is the coordinator.

It is not the domain resolver itself.

---

# 5. ASR Service Responsibility

ASR is responsible for:

```text
microphone capture

speech recognition

partial transcripts

final transcript

confidence/hypotheses

speech timeout

recognition errors
```

ASR is **not** responsible for:

```text
deciding what content to play

finding programmes

choosing a story

giving feedback

understanding catalogue entities

deciding app navigation intent
```

Those responsibilities belong to other layers.

---

# 6. ASR Service Interface

Recommended service contract:

```ts
interface ASRService {
  initialize(): Promise<void>;

  isSupported(): Promise<boolean>;

  getPermissionStatus(): Promise<MicrophonePermission>;

  requestPermission(): Promise<MicrophonePermission>;

  start(options?: ASRStartOptions): Promise<void>;

  stop(): Promise<void>;

  cancel(): Promise<void>;

  subscribe(listener: ASREventListener): () => void;
}
```

The React UI should not call platform ASR libraries directly.

---

# 7. ASR Events

Recommended event types:

```ts
type ASREvent =
  | { type: "ready" }
  | { type: "listening" }
  | { type: "speechStart" }
  | { type: "partial"; transcript: string }
  | {
      type: "final";
      hypotheses: ASRHypothesis[];
    }
  | { type: "timeout" }
  | { type: "cancelled" }
  | { type: "error"; error: ASRError };
```

---

# 8. ASR Hypothesis

Prefer supporting more than one recognition hypothesis when available.

```ts
interface ASRHypothesis {
  transcript: string;
  confidence?: number;
}
```

Example:

```text
1. "play BBC radio four" — 0.91
2. "play BBC radio 4" — 0.87
```

These alternatives may help the external resolver.

---

# 9. Global ASR State

Recommended high-level state:

```text
IDLE

PREPARING

LISTENING

SPEECH DETECTED

PROCESSING

RESOLVING

CLARIFYING

EXECUTING

SUCCESS

ERROR

CANCELLED
```

Only one state/session controls the microphone at a time.

---

# 10. Voice Session

Each invocation creates a new session.

```ts
interface VoiceSession {
  id: string;

  source:
    | "gesture"
    | "button"
    | "accessibility"
    | "onboarding"
    | "retry"
    | "clarification";

  startedAt: number;

  screenSnapshot: ScreenContextSnapshot;

  abortController: AbortController;
}
```

Every ASR and resolver callback must be associated with the active session ID.

---

# 11. Why Session IDs Matter

Example:

```text
Session A starts
↓
resolver request starts
↓
user cancels
↓
Session B starts
↓
Session A response arrives late
```

Without session validation:

```text
old action could execute
```

With session validation:

```text
Session A !== active session
↓
discard response
```

This is mandatory.

---

# 12. Active Screen Context

The provider must know what screen is currently focused.

Example:

```ts
interface ScreenContext {
  id: string;

  pathname: string;

  title: string;

  state?: string;

  readout?: () => string;

  voiceEnabled?: boolean;

  resolverContext?: Record<string, unknown>;

  localCommands?: string[];

  gestures?: GestureMap;
}
```

---

# 13. Register Based on Focus

Do not determine the current screen simply by React component mounting.

Example:

```text
Home mounted

Discover mounted

Player mounted
```

Only one is currently active.

Therefore:

```text
navigation focus
↓
active screen context
```

must be used.

---

# 14. Active Surface

The provider should distinguish:

```text
SCREEN

MODAL

BOTTOM SHEET

VOICE OVERLAY
```

Priority:

```text
System dialog
↓
Voice overlay
↓
Modal / bottom sheet
↓
Focused screen
```

This matters because what is visually and interactively on top should receive user input.

---

# 15. Normal Voice Invocation

When onboarding is complete and the system screen reader is OFF:

```text
DOUBLE TAP
     ↓
global gesture detector
     ↓
current surface allows voice?
     ↓
YES
     ↓
start voice session
```

---

# 16. TalkBack / VoiceOver Invocation

When TalkBack/VoiceOver is enabled, Hear must not steal the system double-tap gesture.

Voice invocation must be exposed as a native accessible action/control.

For example:

```text
Voice control
Button
```

or an appropriate accessibility action such as:

```text
Start voice control
```

Activation still calls:

```text
VoiceProvider.startVoiceSession()
```

---

# 17. Starting a Session

Flow:

```text
VOICE REQUEST
      ↓
Create session ID
      ↓
Capture current screen context
      ↓
Check microphone permission
      ↓
Check ASR availability
      ↓
Stop conflicting TTS
      ↓
Coordinate current playback
      ↓
Haptic
      ↓
Listening tone
      ↓
ASR.start()
```

---

# 18. TTS and ASR Coordination

Hear must never listen while speaking its own instruction.

Correct:

```text
TTS
 ↓
TTS complete
 ↓
tone
 ↓
ASR
```

Incorrect:

```text
ASR
 ↓
TTS
```

The speech coordinator and ASR service must cooperate globally.

---

# 19. Current Audio Playback

If media is playing when voice is invoked:

```text
voice requested
      ↓
pause or duck Hear playback
      ↓
begin ASR
```

The exact choice between ducking and pausing can depend on platform behaviour, but ASR should not compete with loud Hear audio.

After the command:

```text
resume previous playback
```

unless the resolved command intentionally changes playback.

---

# 20. ASR Listening

During listening:

```text
ASR state = LISTENING
```

User gets:

```text
listening tone

haptic indication

visual overlay state
```

Avoid unnecessary spoken text once listening has begun.

---

# 21. Partial Transcripts

Partial transcripts are primarily for:

```text
UI feedback

diagnostics

latency improvement where supported
```

Do not execute commands based on unstable partial text unless the design explicitly supports safe incremental resolution.

---

# 22. Final Transcript

Example:

```json
{
  "sessionId": "hear-voice-9382",
  "hypotheses": [
    {
      "transcript": "play my local news",
      "confidence": 0.93
    }
  ]
}
```

Once final speech is available:

```text
stop listening
↓
processing
```

---

# 23. Normalisation

Safe normalization can include:

```text
trim whitespace

normalise repeated spaces

standard casing

normalise basic punctuation

preserve names

preserve places

preserve numbers

preserve alternate hypotheses
```

Do not rewrite user intent aggressively.

---

# 24. Command Router

After ASR, Hear decides whether the speech is:

```text
LOCAL APP CONTROL

or

EXTERNAL RESOLVER COMMAND
```

---

# 25. Local App Controls

Commands that are deterministic and do not require domain/content resolution may be local.

Examples:

```text
cancel

repeat

read this screen

go back

close voice

open Settings

open Library

open Discover
```

These can be handled by the application directly if that is the intended architecture.

---

# 26. External Resolver Commands

The external resolver owns domain understanding.

Examples:

```text
Play my local news

Play BBC Radio 4

Play the latest episode of ...

Find a programme about football

Give this story a thumbs down

I don't like this

Save this

Play something from Herne Bay

Play the programme I heard yesterday
```

ASR sends text/context.

The resolver determines intent and entities.

---

# 27. Resolver Request

Recommended request:

```ts
interface ResolverRequest {
  sessionId: string;

  hypotheses: ASRHypothesis[];

  context: {
    screenId: string;

    pathname: string;

    screenState?: string;

    activeContent?: ActiveContentContext;

    playback?: PlaybackContext;

    location?: LocationContext;

    clarification?: ClarificationContext;
  };
}
```

---

# 28. Screen ID and Path

Do not misuse a display title as a route path.

Bad:

```text
currentPath = "Discover"
```

Good:

```text
screenId = "discover"

pathname = "/(tabs)/discover"
```

Display titles and navigation identifiers should be separate values.

---

# 29. Active Content Context

Screens that represent content should expose the relevant object.

Example:

```ts
{
  activeContent: {
    id: "story_123",
    type: "story",
    title: "Local weather warning"
  }
}
```

This gives meaning to commands such as:

```text
play this

save this

give feedback on this

tell me more about this
```

---

# 30. Playback Context

The provider should make playback context available.

Example:

```ts
{
  playback: {
    playing: true,
    contentId: "story_123",
    title: "Local weather warning",
    positionMs: 42000
  }
}
```

This helps the resolver understand:

```text
pause this

restart this

skip this

I don't like this

what am I listening to?
```

---

# 31. External Resolver Output

The resolver should return structured results.

Example success:

```json
{
  "kind": "invocation",
  "actionId": "content.play",
  "confidence": 0.95,
  "parameters": {
    "contentId": "abc123"
  }
}
```

---

# 32. Resolver Result Types

Recommended:

```text
RESOLVED

CLARIFICATION REQUIRED

NO MATCH

ERROR
```

Example conceptual type:

```ts
type ResolverResult =
  | ResolvedInvocation
  | ResolverChoices
  | ResolverNoMatch
  | ResolverError;
```

---

# 33. Executor

The resolver must not directly manipulate React components.

Flow:

```text
Resolver Result
      ↓
Executor
      ↓
Correct Application Service
```

Examples:

```text
content.play
→ Playback Service

feedback.submit
→ Feedback Service

navigation.open
→ Navigation Service

library.save
→ Library Service
```

---

# 34. Playback Example

User says:

> Play my local news.

Flow:

```text
ASR
↓
"play my local news"
↓
resolver
↓
content.play
+
resolved content
↓
executor
↓
playback service
↓
audio begins
↓
confirmation if needed
```

---

# 35. Feedback Example

User is currently playing an item.

User says:

> I don't like this.

Flow:

```text
ASR transcript
      +
current playback context
      ↓
external resolver
      ↓
feedback action
      ↓
feedback executor
      ↓
backend feedback service
      ↓
success response
```

Announcement:

> Feedback recorded.

The ASR service itself knows nothing about feedback.

---

# 36. Clarification

If the resolver cannot safely choose one result:

```text
resolver
↓
multiple candidates
↓
CLARIFYING
```

Example:

> I found BBC World Service and BBC Radio 4. Which one do you want?

The current voice session remains alive.

---

# 37. Clarification Response

User may answer verbally:

> Radio 4.

Flow:

```text
new ASR capture
      ↓
same clarification session context
      ↓
resolver
      ↓
final resolution
```

Do not discard the previous clarification context.

---

# 38. Clarification Through Gestures

When TalkBack is OFF, the voice overlay may optionally provide:

```text
Swipe right
→ next choice

Swipe left
→ previous choice

Double tap
→ choose current choice
```

When TalkBack is ON:

```text
each choice = native accessibility element
```

TalkBack/VoiceOver handles focus.

---

# 39. No Match

If the resolver cannot understand the request:

> I couldn't match that command.

Where useful:

> Try saying it another way.

Do not say:

> I couldn't hear you.

unless ASR actually failed to capture speech.

---

# 40. Error Separation

These errors must remain distinct:

```text
MICROPHONE PERMISSION ERROR

ASR ERROR

NO SPEECH

RESOLVER NO MATCH

RESOLVER NETWORK ERROR

CONTENT API ERROR

PLAYBACK ERROR

FEEDBACK ERROR
```

Each needs an appropriate user-facing explanation.

---

# 41. Resolver Network Error

Example:

> I heard you, but I can't reach the Hear command service right now.

This communicates that ASR worked.

---

# 42. ASR Failure

Example:

> I couldn't start voice recognition. Double tap to try again.

This communicates that speech capture failed before resolution.

---

# 43. No Speech Timeout

If no speech is detected:

> I didn't hear anything.

Then either:

```text
retry
```

or close voice depending on product behaviour.

---

# 44. Resolver Timeout

If resolution takes too long:

> Hear is taking too long to process that command. Try again.

The resolver request must be aborted if possible.

---

# 45. Cancellation

Cancellation must:

```text
stop ASR

stop timers

abort resolver request

discard late callbacks

clear clarification

close voice overlay

restore media state when appropriate

set voice state = idle
```

---

# 46. Stale Response Protection

Every async operation must validate:

```text
response.sessionId === activeSession.id
```

before execution.

Otherwise:

```text
ignore response
```

This applies to:

```text
ASR events

resolver responses

clarification responses

network callbacks
```

---

# 47. Navigation During Voice

If user says:

> Open Library.

After execution:

```text
Library becomes focused
↓
active screen context becomes Library
```

The old screen must no longer provide resolver context for future voice sessions.

---

# 48. Context Snapshot

A resolver request captures the context present when the user spoke.

Example:

```text
voice started on Player
currentContent = story123
```

Even if navigation changes while the resolver is processing:

```text
that voice request still belongs to story123
```

unless explicitly cancelled.

---

# 49. Global Voice Overlay

The voice UI should sit above the current screen.

Example:

```text
Player
+
Voice Overlay
```

The user should not have to navigate to a separate voice page.

Overlay states:

```text
Preparing

Listening

Processing

Clarifying

Executing

Success

Error
```

---

# 50. Overlay Interaction

The overlay must be inside the application's global interaction hierarchy so that it does not block all app gestures unintentionally.

Conceptually:

```text
VoiceProvider
   │
   └── GlobalInteractionLayer
          │
          ├── Application Navigation
          │
          └── Global Voice Overlay
```

---

# 51. Global Gestures

When TalkBack/VoiceOver is OFF:

```text
gesture detector
↓
gesture router
↓
active surface
↓
action
```

The gesture detector should only detect:

```text
double tap

swipe left

swipe right

swipe up

swipe down
```

It should not contain feature-specific business logic.

---

# 52. Gesture Meaning

Example normal screen:

```text
Double tap
→ Start voice
```

Example onboarding:

```text
Double tap
→ Continue onboarding
```

Example clarification:

```text
Swipe right
→ Next option
```

Meaning depends on the current active surface.

---

# 53. Scrolling

Screens that support Hear custom scrolling should register scroll functions.

Example:

```ts
{
  scroll: {
    forward: () => scrollForward(),
    backward: () => scrollBackward()
  }
}
```

Then when TalkBack is OFF:

```text
Swipe up
→ scroll forward

Swipe down
→ scroll backward
```

When TalkBack is active, native accessibility scrolling should take priority.

---

# 54. Read Screen

Each meaningful screen can provide:

```ts
readout: () => string
```

Then local command:

> Read this screen.

can use the currently registered readout.

The voice provider does not need to inspect rendered React text dynamically.

---

# 55. Speech Coordinator

All Hear-generated speech must use one coordinator.

Sources include:

```text
screen readout

onboarding

voice results

errors

clarifications

permission messages

playback confirmations
```

The coordinator prevents speech collisions.

---

# 56. Speech Priority

Suggested priorities:

```text
CRITICAL
permission / serious errors

HIGH
clarification

NORMAL
command response

LOW
orientation / guidance
```

A high-priority message may interrupt lower-priority guidance.

---

# 57. TalkBack / VoiceOver and TTS

When a system screen reader is active, avoid duplicating everything with custom TTS.

Native accessibility announcements/focus should be used where appropriate.

The accessibility layer decides whether a message should be:

```text
native accessibility announcement

custom Hear TTS

or neither
```

---

# 58. Permissions

Microphone permission is owned centrally.

The provider/service checks permission:

```text
before first voice use

after returning from Settings

after permission-related errors
```

Screens do not separately manage microphone permission.

---

# 59. Backgrounding

If the app becomes inactive while ASR is active:

```text
cancel ASR

abort resolver if appropriate

clear timers

close voice session
```

Do not leave a hidden microphone session running.

---

# 60. Audio Interruptions

Handle:

```text
phone calls

Bluetooth disconnects

audio focus changes

another app taking the microphone

headset changes
```

The session should fail gracefully and allow retry.

---

# 61. Privacy

Hear must maintain predictable microphone behaviour:

```text
explicit invocation required

one command at a time

microphone closes after command

no hidden continuous listening

clear listening indication

permission can be disabled
```

Do not store microphone audio unless explicitly required and covered by privacy policy.

---

# 62. Diagnostics

Useful diagnostics:

```text
voice session ID

invocation source

screen ID

ASR start latency

time to final transcript

resolver latency

execution latency

ASR confidence

resolver result type

action ID

error category

clarification count
```

Avoid logging sensitive raw audio.

Be deliberate about storing full transcripts.

---

# 63. Recommended Code Responsibility

```text
src/
│
├── providers/
│   ├── VoiceProvider.tsx
│   └── AccessibilityProvider.tsx
│
├── services/
│   ├── asr/
│   │   ├── asr-service.ts
│   │   ├── asr-permission.ts
│   │   ├── asr-types.ts
│   │   └── asr-errors.ts
│   │
│   └── voice/
│       ├── resolver.ts
│       ├── executor.ts
│       ├── speech-coordinator.ts
│       ├── diagnostics.ts
│       └── repository.ts
│
├── accessibility/
│   ├── interaction-registry.ts
│   ├── gesture-router.ts
│   └── surface-registry.ts
│
└── components/
    └── voice/
        ├── GlobalVoiceDock.tsx
        └── GlobalGestureLayer.tsx
```

Exact naming may change.

Responsibilities should not.

---

# 64. Screen Responsibility

Each screen should only provide context.

Example:

```ts
registerScreen({
  id: "player",

  pathname: "/player",

  title: "Now Playing",

  readout: buildPlayerReadout,

  resolverContext: {
    activeContent: currentItem,
    playback: playbackState
  },

  voiceEnabled: true
});
```

A screen should not implement its own:

```text
ASR

microphone permission

resolver networking

global TTS

global gesture detector
```

---

# 65. VoiceProvider Responsibility

The provider handles:

```text
START SESSION

PREPARE AUDIO

START ASR

RECEIVE TRANSCRIPT

ROUTE COMMAND

CALL RESOLVER

EXECUTE RESULT

ANNOUNCE RESULT

END SESSION
```

---

# 66. External Resolver Boundary

The external resolver handles:

```text
intent understanding

content names

track names

programme names

presenters

locations

ambiguous phrases

play requests

feedback intent

user-content references

domain matching
```

The mobile app supplies context.

The external resolver supplies structured meaning.

---

# 67. Full Example — Play Command

```text
USER
"Play my local news"
      │
      ▼
GLOBAL ASR
      │
      ▼
Transcript
"play my local news"
      │
      ▼
External Resolver
      │
      ▼
{
  actionId: content.play,
  contentId: ...
}
      │
      ▼
Executor
      │
      ▼
Playback Service
      │
      ▼
Player state updates
      │
      ▼
"Playing your local news."
```

---

# 68. Full Example — Feedback

```text
User currently listening to Story A
      │
      ▼
"I don't like this"
      │
      ▼
ASR
      │
      ▼
Transcript
      │
      +
activeContent = Story A
      │
      ▼
External Resolver
      │
      ▼
feedback.submit
target = Story A
sentiment = negative
      │
      ▼
Feedback Service
      │
      ▼
"Feedback recorded."
```

---

# 69. Full Example — Clarification

```text
USER
"Play BBC news"
      │
      ▼
ASR
      │
      ▼
Resolver
      │
      ▼
Multiple valid results
      │
      ▼
"Do you mean BBC World Service
or BBC Radio 4?"
      │
      ▼
USER
"Radio 4"
      │
      ▼
ASR
      │
      ▼
Resolver with clarification context
      │
      ▼
Resolved
      │
      ▼
Playback
```

---

# 70. Full Example — Local Command

```text
USER
"Read this screen"
      │
      ▼
ASR
      │
      ▼
Local Command Router
      │
      ▼
currentScreen.readout()
      │
      ▼
Speech Coordinator
      │
      ▼
Screen content spoken
```

No external resolver is required if this command is deterministic.

---

# 71. Acceptance Tests

## Global Availability

From every voice-enabled screen:

```text
invoke voice
↓
same ASR service starts
```

There must never be two concurrent recognizers.

## Context

From Player:

```text
resolver receives Player context
```

From Discover:

```text
resolver receives Discover context
```

Mounted but unfocused screens must not supply context.

## Playback

User says:

> Play my local news.

Expected:

```text
ASR
→ resolver
→ executor
→ playback
```

## Feedback

User says:

> I don't like this.

Expected:

```text
ASR
→ current content context
→ resolver
→ feedback executor
→ confirmation
```

## Cancellation

Cancel during resolver request.

Expected:

```text
request aborted
late result ignored
no action executed
```

## TalkBack

Expected:

```text
Hear does not steal TalkBack gestures.

Voice remains available through accessible controls/actions.
```

## TTS / ASR

Expected:

```text
Hear never recognises its own spoken instructions.
```

---

# 72. Final ASR Flow

```text
ANY SCREEN IN HEAR
        │
        ▼
VOICE INVOCATION
        │
        ▼
VOICE PROVIDER
        │
        ├── Screen Context
        ├── Content Context
        ├── Playback Context
        └── Voice Session ID
        │
        ▼
GLOBAL ASR SERVICE
        │
        ▼
TRANSCRIPT / HYPOTHESES
        │
        ▼
COMMAND ROUTER
     /             \
    /               \
LOCAL COMMAND     DOMAIN COMMAND
    │                 │
    │                 ▼
    │          EXTERNAL RESOLVER
    │                 │
    │                 ▼
    │          STRUCTURED ACTION
    │                 │
    └─────────┬───────┘
              ▼
           EXECUTOR
              │
      ┌───────┼─────────┐
      │       │         │
 Playback  Feedback  Navigation
      │       │         │
      └───────┼─────────┘
              ▼
         APP RESULT
              │
              ▼
      SPEECH + HAPTIC + UI
              │
              ▼
         SESSION END
```

The core rules are:

**One ASR service across the entire application.**

**Screens provide context; they do not own recognizers.**

**The external resolver owns domain understanding such as play requests, content matching and feedback.**

**Every async response is tied to a voice session.**

**TalkBack/VoiceOver retains ownership of its native gestures.**

**ASR and Hear TTS must never compete.**

**Every voice interaction must finish with a clear result for the user.**