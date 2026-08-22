# Hear! Listener — Voice Access, Accessibility & ASR Technical Issue Audit

## 1. Document Purpose

This document consolidates the issues discovered in the current Hear! Listener voice-access implementation.

The problems affect:

- onboarding;
- automatic screen narration;
- TalkBack and VoiceOver;
- microphone permission handling;
- ASR startup and shutdown;
- long-form speech;
- speech timeout behaviour;
- listening indicators;
- voice overlay behaviour;
- resolver integration;
- clarification;
- current-screen awareness;
- active-content awareness;
- playback;
- feedback;
- search;
- downloads;
- live/server-loaded content;
- audio interruptions;
- success/error announcements.

These problems need to be treated as one connected system rather than isolated UI bugs.

Hear is designed for blind and visually impaired users. Therefore a visual interface appearing correct is not sufficient.

The basic accessibility requirement is:

> If the screen were completely black, the user should still understand where they are, what Hear is doing, what happened, and what they should do next.

---

# 2. Severity Classification

Issues in this document are classified as:

### P0 — Critical

Breaks the core blind-user experience, causes incorrect microphone behaviour, allows Hear to hear itself, creates inaccessible interaction, or can execute commands incorrectly.

### P1 — High

Major functionality is incomplete or unreliable but may not break every voice session.

### P2 — Medium

Architecture, consistency, diagnostics, or edge-case problems that should be fixed after core reliability.

---

# 3. Main Architectural Problem

The current implementation contains many of the correct pieces:

```text
VoiceProvider
SpeechCoordinator
VoiceGestureLayer
GlobalVoiceDock
ASR
Resolver
Executor
AppScreen
AccessibilityProvider
Onboarding
Playback Store
Content Store
```

However, the lifecycle between them is not yet strict enough.

The required architecture should be:

```text
CURRENT SCREEN / SURFACE
          │
          ▼
USER INVOKES VOICE
          │
          ▼
VOICE PROVIDER
          │
          ├── screen context
          ├── content context
          ├── playback context
          └── voice session
          │
          ▼
STOP ALL HEAR AUDIO
          │
          ▼
LISTENING TONE
          │
          ▼
ASR
          │
          ▼
COMPLETE USER UTTERANCE
          │
          ▼
COMMAND ROUTER
       /         \
      /           \
 LOCAL ACTION   EXTERNAL RESOLVER
      \           /
       \         /
        ▼       ▼
         EXECUTOR
            │
            ▼
       REAL FEATURE
            │
            ▼
      VERIFIED RESULT
            │
            ▼
        SPEAK RESULT
```

Each lifecycle stage must finish before the next begins.

---

# 4. P0 — ASR Reports Listening Before the Microphone Is Actually Ready

## Problem

The voice state can become:

```text
LISTENING
```

before native speech recognition has confirmed that recognition successfully started.

If native ASR startup fails, the interface may still temporarily indicate that Hear is listening.

## User Impact

A blind user hears the listening cue or sees the listening UI but the microphone is not actually accepting speech.

They may speak a command and receive:

> I didn't hear anything.

even though the failure occurred before they spoke.

## Required Fix

Introduce a real state sequence:

```text
IDLE
↓
PREPARING
↓
STARTING_ASR
↓
native ASR start event
↓
LISTENING
```

The 8-second no-speech countdown must begin only after native ASR confirms recognition has started.

---

# 5. P0 — Hear May Begin Speaking Before Native ASR Is Fully Closed

## Problem

The logical voice quiet mode can be released before native speech recognition has confirmed that the microphone session has ended.

Calling:

```text
stop()
```

does not automatically mean:

```text
microphone is already closed
```

## User Impact

Hear can begin speaking its result while speech recognition is still shutting down.

The recognizer may then hear Hear's own response.

This can create:

- false transcripts;
- unintended follow-up commands;
- corrupted clarification;
- unexpected resolver requests.

## Required Fix

Use:

```text
request ASR stop
↓
wait for native recognition end/stop event
↓
mark microphone closed
↓
exit quiet mode
↓
allow TTS
```

No Hear speech should be permitted before microphone closure is confirmed.

---

# 6. P0 — Onboarding Enters Listening State Before Its Prompt Is Finished

## Problem

The onboarding lifecycle can mark the voice-test state as listening before the instructional speech and listening tone have completed.

This causes a mismatch between:

```text
UI state
```

and:

```text
actual microphone state
```

## Required State Model

Use:

```text
voiceTestPrompting
↓
voiceTestStarting
↓
voiceTestWaitingForSpeech
↓
voiceTestUserSpeaking
↓
voiceTestResolving
↓
voiceTestSuccess / voiceTestError
```

The UI must not display:

> HEAR IS LISTENING

until ASR is genuinely running.

---

# 7. P0 — Listening Tone Can Be Captured by ASR

## Problem

The listening-start sound is triggered without waiting for the sound to finish.

The sequence can effectively become:

```text
tone begins
↓
ASR starts
↓
tone still playing
```

## User Impact

The ASR engine may capture Hear's listening tone.

## Required Fix

The audio function must become awaitable:

```text
await playListeningStartTone();
await startASR();
```

The tone must finish before the microphone opens.

---

# 8. P0 — Hear Must Be Completely Silent While Listening

## Problem

Multiple application systems can currently attempt to produce audio while ASR is active.

Potential sources include:

```text
screen narration
idle reminders
listening reminders
one-shot sounds
playback
navigation sounds
TalkBack-triggered live regions
queued TTS
resolver messages
```

## Required Rule

Once ASR is active:

```text
HEAR TTS = BLOCKED
HEAR SCREEN SPEECH = BLOCKED
HEAR IDLE REMINDERS = BLOCKED
HEAR ONE-SHOT AUDIO = BLOCKED
HEAR PLAYBACK = PAUSED/DUCKED
```

Allowed:

```text
ASR
visual state changes
haptic feedback
```

---

# 9. P0 — The 8-Second Timer Must Only Apply Before Speech Starts

## Correct Meaning

The 8-second timer means:

> The microphone opened and the user has not started speaking.

It must never mean:

> Stop recognition eight seconds after opening the microphone.

## Required Flow

```text
microphone starts
↓
8-second pre-speech countdown
```

If speech is detected:

```text
cancel 8-second timer permanently
```

The timer must not return during the same utterance.

---

# 10. P0 — User Speech Can Still Be Ended Too Early

## Problem

Blind users may speak naturally with pauses.

Example:

> Play me the latest news from... Herne Bay... about transport.

A short silence must not be interpreted as the end of the command.

## Required Behaviour

After speech starts:

```text
no 8-second timer
```

Track:

```text
lastSpeechActivityAt
```

Update it on:

```text
speech start
partial result
final segment
new words
```

Only finish after approximately:

```text
3–3.5 seconds
```

of genuine inactivity.

---

# 11. P0 — Onboarding Can Validate a Partial Transcript Too Early

## Problem

The onboarding voice test may inspect the current transcript while the user is still speaking.

If the partial transcript already contains:

> Play my local news

the onboarding can treat it as success and close the session before the user finishes.

## Example

User says:

> Play my local news please because I want today's bulletin.

Hear may detect:

> Play my local news

and immediately advance.

## Required Fix

Onboarding must not react to ordinary partial transcript changes.

It should wait for a dedicated event such as:

```text
utteranceFinalized
```

Only the finalized transcript should decide voice-test success.

---

# 12. P0 — Step 3 Can Start Voice Listening More Than Once

## Problem

The account state can start its voice-selection process through multiple paths.

For example:

```text
voice test success
↓
set account state
↓
explicitly start account listening
```

while another state effect also observes account entry and starts account listening.

## Result

Possible symptoms:

- duplicated TTS;
- multiple listening tones;
- recognition starting twice;
- ASR being stopped unexpectedly;
- Step 3 appearing silent;
- inconsistent state.

## Required Fix

A state must have exactly one owner.

Correct:

```text
enter accountNarrating
↓
one state effect runs
↓
speak Step 3
↓
wait for speech completion
↓
tone
↓
start ASR once
```

No other function should independently start the account listener.

---

# 13. P0 — Step 3 May Appear Without Spoken Guidance

## Problem

A blind user can reach the Optional Account screen but receive no useful narration.

This occurs when screen narration depends on visual lifecycle events or success speech gets interrupted during navigation.

## Required Behaviour

Every entry into Step 3 must independently announce:

> Optional account. Step 3 of 3. An account keeps your saved audio and listening progress with you. After the tone, say Apple, Google, or Not now.

Then:

```text
wait for speech to finish
↓
tone
↓
ASR
```

Step 3 must never rely on the Step 2 success announcement to explain itself.

---

# 14. P0 — Screen Narration Must Not Depend on Layout

## Problem

Layout events are not navigation events.

Using:

```text
onLayout
```

to trigger important spoken guidance can fail when:

- component content changes;
- state changes without layout;
- React reuses the same tree;
- a new logical onboarding screen occupies the same layout.

## Required Fix

Narration must follow:

```text
screen focus
```

or:

```text
onboarding phase entry
```

not visual layout.

---

# 15. P0 — Automatic Speech Exists in Multiple Places

## Problem

Automatic speech can originate from multiple systems such as:

```text
AppScreen
VoiceProvider
AccessibilityProvider
SpeechCoordinator
onboarding hooks
AccessibilityInfo
Hear TTS
```

The same text can be spoken twice or overlapping speech can occur.

## Required Fix

There must be one speech authority:

```text
SpeechCoordinator
```

All Hear-generated narration goes through it.

It decides:

```text
what speaks
priority
whether previous speech is cancelled
whether speech is allowed
whether microphone quiet mode blocks speech
```

---

# 16. P0 — TalkBack Can Potentially Speak Into ASR

## Problem

Live accessibility regions can update while recognition is active.

TalkBack may automatically read those changes.

Hear's own audio gate cannot mute TalkBack because TalkBack is controlled by the operating system.

## Required Fix

While ASR is open:

```text
accessibilityLiveRegion = none
```

Do not automatically move accessibility focus.

Do not trigger accessibility announcements.

After microphone closure, normal TalkBack announcements can resume.

---

# 17. P0 — Global Single Tap Can Cancel Speech During TalkBack Exploration

## Problem

The global interaction layer can use a single tap to cancel speech.

A TalkBack user naturally touches the screen to explore controls.

Those touches must not accidentally terminate Hear narration.

## Required Fix

When:

```text
screenReaderEnabled = true
```

disable Hear's custom global single-tap cancellation.

TalkBack owns touch exploration.

---

# 18. P0 — “Double-Tap Anywhere” Is Not Globally Possible Under TalkBack

## Important Platform Limitation

When TalkBack is enabled, Android owns the physical double-tap gesture.

Hear cannot simultaneously use:

```text
double tap anywhere = voice
```

and preserve standard TalkBack:

```text
double tap = activate currently focused element
```

for every normal screen.

## Onboarding

Onboarding can solve this because a single-action screen can itself be the focused actionable accessibility element.

Then:

```text
physical double tap
↓
TalkBack activates focused onboarding screen
↓
Hear action
```

## Main App

For normal screens with many controls, Hear needs a deliberate accessibility invocation method.

Possible options include:

```text
a consistent Voice Control accessibility element
```

or:

```text
a custom native accessibility action
```

The app must not pretend that TalkBack users receive the same global gesture interception as users without a screen reader.

---

# 19. P0 — Permission Error Instruction Does Not Always Match Actual Gesture Behaviour

## Problem

Hear can say:

> Microphone access is off. Double-tap anywhere to open Settings.

But the generic error-state double tap can instead restart a voice session.

## User Impact

The blind user follows the spoken instruction and receives the wrong action.

## Required Fix

Error states need explicit recovery actions.

Example:

```text
permissionDenied
→ double tap = open Settings

noSpeech
→ double tap = retry voice

resolverFailure
→ double tap = retry voice

networkFailure
→ double tap = retry or dismiss
```

The spoken instruction must always match the actual current action.

---

# 20. P0 — Clarification Is Not Fully Voice-Driven

## Problem

The resolver can return several choices and Hear can ask:

> Which one did you mean?

But the voice flow may stop there and expect a UI choice.

This breaks a strictly voice-first application.

## Required Flow

```text
resolver returns choices
↓
close first ASR session
↓
Hear speaks clarification
↓
speech finishes
↓
tone
↓
open ASR again
↓
user says:
"first one"
"BBC Radio 4"
"second one"
"cancel"
↓
resolve clarification
```

The clarification context must survive between voice captures.

---

# 21. P1 — Continuous Recognition Transcript Merging Is Too Naive

## Problem

Continuous recognizers may return cumulative segments.

Example:

```text
play local
play local news
play local news from Herne Bay
```

If these are simply appended:

```text
play local play local news play local news from Herne Bay
```

is produced.

## Required Fix

Implement overlap-aware transcript merging.

The algorithm should detect:

```text
existing suffix
new segment prefix
```

and append only genuinely new words.

---

# 22. P1 — ASR Alternatives Are Being Lost

## Problem

Speech recognition can provide several alternatives.

For example:

```text
Herne Bay
Hearn Bay
Herne bae
```

This is extremely useful for:

- locations;
- names;
- organisations;
- programme titles.

If only the first ASR hypothesis is passed onward, the resolver loses useful information.

## Required Fix

Preserve the top N ASR hypotheses:

```text
transcript
confidence
rank
```

and pass them to the resolver.

---

# 23. P1 — Recognition Activity Watchdog Can Still Terminate Active Speech

## Problem

A hard recognition timeout can still end a session even while transcript activity continues.

## Required Behaviour

A watchdog must represent:

> Recognition appears stuck.

It should reset whenever:

```text
speech starts
partial text changes
final segment arrives
```

Do not use a simple wall-clock maximum to terminate somebody who is actively speaking.

---

# 24. P1 — Need a Sensible Transcript Safety Limit

## Requirement

The microphone cannot remain open forever.

Recommended command safety limit:

```text
approximately 800 characters
```

If reached:

```text
stop recognition
resolve collected text
```

This should be a safety condition, not the normal end-of-speech mechanism.

---

# 25. P1 — iOS Recognition Configuration May Be Too Restrictive

## Problem

Requiring on-device recognition on every supported iOS device may cause voice recognition to fail where Apple's speech service works but the on-device model is unavailable.

## Required Fix

Detect capability:

```text
on-device recognition supported
→ prefer on-device

not supported
→ use allowed system recognition fallback
```

unless Hear has an explicit privacy requirement prohibiting non-local Apple recognition.

---

# 26. P1 — iOS Task Hint Is Not Appropriate for General Commands

## Problem

A confirmation-style speech hint is appropriate for inputs similar to:

```text
yes
no
Apple
Google
```

but Hear supports long general-purpose voice commands.

## Required Fix

Use:

```text
dictation
```

or:

```text
unspecified
```

for ordinary Hear voice commands.

A specialised mode can be used during Step 3 where the vocabulary is intentionally small.

---

# 27. P1 — Current Resolver in the App Is Still Local

## Problem

The repository's active voice resolver is currently a local SQLite resolver.

The external domain resolver described for Hear is not yet the active authority in this mobile pipeline.

## Impact

Commands involving:

- newly published content;
- complex matching;
- server catalogue;
- feedback;
- large taxonomy;
- remote content;

will not automatically use the external resolver.

## Required Architecture

```text
VoiceProvider
↓
VoiceResolverClient
↓
external resolver API
↓
structured action
↓
mobile executor
```

Local SQLite can remain as:

```text
offline fallback
deterministic local matcher
cache
```

but should not silently replace the intended domain resolver.

---

# 28. P1 — Resolver Context Is Too Weak

## Problem

The existing types already contain useful context concepts, but the active resolver request does not consistently receive enough of them.

The resolver should know:

```text
screenId
pathname
screenState
current content
focused item
search result
playback item
current organisation
current programme
current story
location
preferences
clarification context
```

Without this, phrases such as:

> Play this.

> Save this.

> Give feedback on this.

> Play the first result.

> Follow this organisation.

are ambiguous.

---

# 29. P1 — Current Screen Context Can Be Wrong

## Problem

Some routes are not represented correctly in the screen registry.

Fallback logic can classify unknown screens as Home.

Some screens may even register themselves as another screen type.

## Impact

The resolver receives incorrect context.

Example:

```text
Sleep Timer
```

being treated as:

```text
Player
```

creates unreliable command interpretation.

## Required Fix

Every voice-enabled route must have a unique stable screen ID.

Example:

```text
home
discover
search
library
player
queue
sleepTimer
settings
account
topic
organisation
programme
story
```

Unknown routes should not silently become Home.

---

# 30. P1 — Search Voice Commands Are Advertised But Not Fully Implemented

## Problem

The application tells users they can say commands such as:

> Search for local news.

But execution can return a failure response rather than actually updating search.

## Accessibility Impact

A blind user trusts spoken orientation more heavily than a sighted user trusts visual helper copy.

Promising a command that does not work is particularly damaging.

## Required Fix

Either:

```text
implement search command properly
```

or:

```text
remove it from spoken guidance until implemented
```

---

# 31. P1 — Feedback Is Not a First-Class Voice Action Yet

## Problem

The intended external resolver may understand:

> I don't like this.

> Give this positive feedback.

But the mobile executor currently lacks a complete feedback action contract.

## Required Addition

Example action:

```text
feedback.submit
```

Parameters:

```text
targetContentId
feedbackType
optional reason
```

Execution:

```text
resolver
↓
feedback.submit
↓
FeedbackService
↓
backend
↓
confirmed response
↓
Hear speaks success
```

Do not say:

> Feedback recorded.

until the backend confirms it.

---

# 32. P1 — Voice Search, Feedback and Other Remote Operations Need Async Executors

## Problem

The current command execution model contains synchronous assumptions.

Future voice actions are inherently asynchronous:

```text
feedback
download
search
account login
server playback lookup
follow
save
```

## Required Contract

Use:

```ts
Promise<VoiceExecutionResult>
```

The final announcement occurs only after real completion.

---

# 33. P1 — Live Server Content Is Not Unified With Voice Content

## Problem

The current app still contains static/bundled catalogue usage in important areas.

If new content arrives from the server:

```text
UI may know it
```

while:

```text
voice resolver may not know it
```

or:

```text
playback next/previous may still use static content
```

## Required Fix

Create one current catalogue/data source used by:

```text
UI
voice context
resolver sync
playback
search
queue
library
```

The voice system must be able to reference content loaded after app installation.

---

# 34. P1 — Download Command Can Report Success Without Downloading Audio

## Problem

A voice command may say:

> Downloading for offline listening.

while only adding the content ID to a preferences list.

## Accessibility Impact

A blind user may reasonably believe the audio has actually been downloaded.

## Required Fix

Connect voice download to the actual download service.

Only announce:

> Download complete.

after the real asset is stored.

Use:

> Download started.

if the operation is still in progress.

---

# 35. P1 — Playback May Resume Under Hear's Spoken Result

## Problem

Paused programme audio may resume before Hear finishes announcing the command result.

Result:

```text
programme audio
+
Hear TTS
```

at the same time.

## Required Sequence

For commands that should resume previous playback:

```text
execute command
↓
speak result
↓
wait until result speech finishes
↓
resume previous playback
```

For commands that intentionally alter playback:

```text
do not restore old playback
```

---

# 36. P1 — ASR and Playback Need One Audio Session Policy

Voice invocation during active playback should follow:

```text
capture previous playback state
↓
pause/duck playback
↓
voice prompt
↓
tone
↓
ASR
↓
resolve
↓
execute
↓
announce
↓
restore playback only when appropriate
```

The app must know whether a command such as:

```text
pause
play something else
skip
stop
```

means the previous audio should not return.

---

# 37. P1 — No-Speech Reminder Must Not Generate Audio

## Problem

A reminder during the open microphone window can produce an application sound.

Even a short click can be detected by ASR.

## Correct Behaviour

At around four seconds without speech:

```text
haptic only
```

Visual interface may say:

```text
Still listening…
```

But:

```text
no TTS
no click
no audio ping
```

---

# 38. Required 8-Second Listening UI

During pre-speech listening:

```text
● LISTENING                       ◯ 8s
```

The dot should pulse.

The circular timer should count:

```text
8
7
6
5
4
3
2
1
0
```

Once speech is detected:

```text
● I CAN HEAR YOU
```

The no-speech countdown disappears.

It must not continue toward zero while the user is talking.

---

# 39. P1 — Listening UI Must Use Provider Timing

## Problem

Independent UI timers can drift from actual ASR timing.

## Required Fix

`VoiceProvider` owns:

```text
listeningStartedAt
listeningDeadlineAt
speechDetected
```

The visual countdown derives remaining time from those values.

It does not independently decide when timeout occurs.

---

# 40. P1 — Voice Overlay Can Interfere With Gestures

## Problem

An absolute voice overlay can become the top touch surface.

If the gesture layer does not own the overlay, global interactions can stop working correctly.

## Required Provider Tree

```text
VoiceProvider
└── VoiceGestureLayer
    ├── application navigation
    └── GlobalVoiceDock
```

Both the application and voice UI live inside the same global interaction layer.

---

# 41. P1 — Voice Overlay Backdrop Can Cancel Too Easily

## Problem

A normal single tap on the backdrop can cancel/dismiss voice.

For blind users, an accidental touch must not close the session.

## Required Fix

During:

```text
preparing
listening
user speaking
resolving
```

do not allow an arbitrary single backdrop press to destroy the voice session.

Use explicit gesture/accessibility actions.

---

# 42. P1 — Error States Need Structured Recovery

Each voice error should contain:

```text
errorCode
spokenMessage
recoveryAction
visualMessage
```

Examples:

```text
NO_SPEECH
message:
"I didn't hear anything."

recovery:
retryVoice
```

```text
PERMISSION_DENIED
message:
"Microphone access is off."

recovery:
openSettings
```

```text
RESOLVER_NETWORK
message:
"I heard you, but I can't reach Hear right now."

recovery:
retryVoice
```

The gesture layer then executes the appropriate recovery action.

---

# 43. P2 — Speech Completion Semantics Are Too Weak

## Problem

A speech request can be considered completed when it was actually stopped/interrupted.

For critical sequences such as:

```text
speak prompt
↓
open microphone
```

this distinction matters.

## Required Result Type

Speech completion should return:

```text
DONE
INTERRUPTED
ERROR
TIMEOUT
```

ASR should automatically follow only:

```text
DONE
```

An interrupted prompt should not automatically open the microphone unless explicitly intended.

---

# 44. P2 — Force Speech Must Not Override Microphone Safety

Some onboarding speech should be mandatory even if normal spoken-guidance preferences are disabled.

A `force` flag may allow:

```text
required onboarding narration
```

but it must never mean:

```text
speak while microphone is active
```

Audio quiet mode always has the highest priority.

---

# 45. P2 — Screen Inactivity Reminders Need a Global Policy

Recommended onboarding policy:

```text
initial narration
↓
15 seconds no action
↓
reminder 1
↓
35 seconds total
↓
reminder 2
↓
silence
```

Maximum:

```text
2 reminders
```

Any interaction or state change cancels reminders.

They must never run while ASR is active.

---

# 46. P2 — App-Wide Narration Copy Needs Validation

Every top-level screen should be reviewed to ensure the spoken orientation accurately describes currently supported commands.

For example, do not say:

> Say “search for something else.”

unless the command actually works.

The narration specification and implementation must remain synchronized.

---

# 47. Required Onboarding Flow

The corrected onboarding should behave as follows:

```text
APP START
   │
   ▼
WELCOME — STEP 1 OF 3
   │
   │ Hear reads screen
   │
   ▼
WAITING
   │
DOUBLE TAP
   │
   ▼
VOICE ACCESS — STEP 2 OF 3
   │
   │ Hear reads permission explanation
   │
   ▼
WAITING
   │
DOUBLE TAP
   │
   ▼
CANCEL HEAR SPEECH
   │
   ▼
NATIVE PERMISSION DIALOG
   │
   ├────────────── DENIED
   │                  │
   │                  ▼
   │         MICROPHONE ACCESS OFF
   │                  │
   │            Hear explains
   │                  │
   │            DOUBLE TAP
   │                  │
   │                  ▼
   │               SETTINGS
   │                  │
   │          RETURN TO HEAR
   │                  │
   │          RECHECK PERMISSION
   │                  │
   └──── GRANTED ◄────┘
            │
            ▼
      VOICE TEST PROMPT
            │
     Hear finishes speech
            │
            ▼
      LISTENING TONE
            │
        tone finishes
            │
            ▼
          ASR
            │
      ● LISTENING 8s
            │
      ┌─────┴──────┐
      │            │
  NO SPEECH     USER SPEAKS
      │            │
      ▼            ▼
  close ASR     cancel 8s
      │            │
  speak retry   keep listening
                   │
             user becomes quiet
                   │
             3–3.5 sec grace
                   │
                   ▼
                RESOLVE
                   │
                   ▼
                SUCCESS
                   │
            speak success
                   │
          wait until finished
                   │
                   ▼
       OPTIONAL ACCOUNT — 3 OF 3
                   │
             Hear reads page
                   │
                   ▼
                  TONE
                   │
                   ▼
                  ASR
                   │
        Apple / Google / Not now
                   │
                   ▼
                COMPLETE
```

---

# 48. Required Normal Voice Flow

From any voice-enabled screen:

```text
SCREEN GAINS FOCUS
        │
        ▼
HEAR ANNOUNCES SCREEN
        │
        ▼
USER INVOKES VOICE
        │
        ▼
CANCEL SCREEN SPEECH
CANCEL IDLE REMINDERS
PAUSE PLAYBACK
        │
        ▼
OPTIONAL VOICE PROMPT
        │
        ▼
WAIT FOR PROMPT
        │
        ▼
LISTENING TONE
        │
        ▼
WAIT FOR TONE
        │
        ▼
MICROPHONE
        │
        ▼
8-SECOND PRE-SPEECH WINDOW
        │
        ├── No speech → close → explain retry
        │
        └── Speech begins
                 │
                 ▼
          CANCEL 8-SECOND TIMER
                 │
                 ▼
          CONTINUE LISTENING
                 │
                 ▼
          USER FINISHES SPEAKING
                 │
                 ▼
           POST-SPEECH GRACE
                 │
                 ▼
            CLOSE MICROPHONE
                 │
                 ▼
               RESOLVER
                 │
                 ▼
              EXECUTOR
                 │
                 ▼
          VERIFIED FEATURE RESULT
                 │
                 ▼
             SPEAK RESULT
```

---

# 49. Resolver Request Contract

The external resolver should eventually receive something similar to:

```json
{
  "sessionId": "voice_session_id",
  "hypotheses": [
    {
      "transcript": "give this story negative feedback",
      "confidence": 0.93,
      "rank": 0
    }
  ],
  "context": {
    "screenId": "player",
    "pathname": "/player",
    "screenState": "playing",
    "activeContent": {
      "id": "story_123",
      "type": "story",
      "title": "Example Story"
    },
    "playback": {
      "playing": true,
      "contentId": "story_123"
    },
    "focusedItem": null,
    "clarification": null
  }
}
```

This makes contextual commands reliable.

---

# 50. Required Resolver Result Contract

Example:

```json
{
  "kind": "invocation",
  "actionId": "feedback.submit",
  "parameters": {
    "contentId": "story_123",
    "feedbackType": "negative"
  }
}
```

The mobile application then executes the real feature.

The resolver must not directly manipulate React Native components.

---

# 51. Required Voice Session Protection

Every voice session must have a unique ID.

All asynchronous callbacks must check:

```text
callback.sessionId === activeSession.id
```

before changing state or executing an action.

This prevents an old request from executing after:

```text
cancel
navigation
new voice session
app backgrounding
```

---

# 52. Required Audio Interruption Handling

Hear can silence Hear-generated audio.

It cannot guarantee that Android/iOS will silence every notification from every other application.

For:

```text
phone calls
Bluetooth interruption
audio focus loss
major external interruption
```

Hear should:

```text
stop/cancel recognition safely
↓
discard unreliable audio
↓
restore stable state
↓
when appropriate speak:
"Voice listening was interrupted.
Double-tap anywhere when you're ready to try again."
```

---

# 53. Recommended File Areas for Fixes

Primary areas to review and modify:

```text
src/providers/VoiceProvider.tsx

src/providers/AccessibilityProvider.tsx

src/providers/voice-context.ts

src/hooks/useOnboardingSetup.ts

src/screens/OnboardingScreen.tsx

src/components/ui/AppScreen.tsx

src/components/onboarding/VoiceAccessStep.tsx

src/components/onboarding/AccountStep.tsx

src/components/voice/VoiceGestureLayer.tsx

src/components/voice/GlobalVoiceDock.tsx

src/components/voice/ListeningPanel.tsx

src/components/voice/VoiceStatusBadge.tsx

src/components/voice/ListeningCountdown.tsx

src/services/voice/speech-coordinator.ts

src/services/voice/speech.ts

src/services/voice/resolver.ts

src/services/voice/executor.ts

src/services/voice/run.ts

src/services/voice/screen-registry.ts

src/services/voice/audio-gate.ts

src/constants/voice.ts

src/constants/onboarding-steps.ts

src/constants/screen-hints.ts

src/utils/voice/platform.ts

src/stores/content-store.ts

src/stores/playback-store.ts
```

---

# 54. Recommended Fix Priority

## Phase 1 — Microphone Safety

Fix first:

```text
true native ASR start confirmation

true native ASR close confirmation

strict audio quiet mode

await listening tone

8-second timer only before speech

post-speech silence handling

partial transcript no longer finalizes commands
```

---

## Phase 2 — Onboarding

Fix:

```text
explicit onboarding state machine

Step 1 narration

Step 2 narration

permission denied narration

Settings return

voice-test sequencing

Step 3 narration

single Step 3 ASR start

timeout recovery
```

---

## Phase 3 — TalkBack / VoiceOver

Fix:

```text
single tap not cancelling speech

no live-region speech during ASR

correct accessibility focus

single-action onboarding screens

normal-app accessible voice invocation

no duplicate Hear/TalkBack announcements
```

---

## Phase 4 — ASR Quality

Fix:

```text
continuous transcript aggregation

overlap deduplication

N-best hypotheses

long natural pauses

activity watchdog

platform-specific configuration
```

---

## Phase 5 — Resolver

Connect:

```text
external resolver

screen context

current content

playback context

search context

clarification context

location

N-best ASR
```

---

## Phase 6 — Real Feature Execution

Implement and verify:

```text
search

feedback

downloads

playback

save

follow

queue

account

server content
```

All result announcements must reflect real feature completion.

---

# 55. Critical Acceptance Tests

The app should not be considered voice-ready until these scenarios pass.

### Scenario A — Hear Never Hears Itself

```text
Hear speaks prompt
↓
prompt completely finishes
↓
tone completely finishes
↓
microphone opens
```

The prompt and tone must not appear in ASR transcript.

---

### Scenario B — No Speech

```text
microphone opens
↓
8-second countdown
↓
4-second haptic only
↓
0
↓
microphone closes
↓
Hear explains timeout
↓
double tap restarts
```

---

### Scenario C — User Pauses While Speaking

User says:

> Play me something from... [2-second pause] ...Herne Bay.

Hear must continue listening.

---

### Scenario D — Long Command

The user speaks a long natural request.

Hear remains listening while transcript activity continues.

No arbitrary 8-second or short silence timeout terminates them.

---

### Scenario E — Step 3

After successful:

> Play my local news.

Hear must:

```text
close microphone
↓
announce success
↓
finish success speech
↓
open Step 3
↓
announce Step 3
↓
finish announcement
↓
tone
↓
listen for Apple / Google / Not now
```

There must be no unexplained silence.

---

### Scenario F — TalkBack

With TalkBack enabled:

```text
onboarding can be completed

Hear does not steal TalkBack gestures

touch exploration does not cancel speech

ASR does not trigger TalkBack live-region speech

permission dialog remains native and accessible
```

---

### Scenario G — Permission Denied

Hear says:

> Microphone access is off. Double-tap anywhere to open Settings.

Double tap must actually open Settings.

---

### Scenario H — Clarification

User:

> Play BBC news.

Hear:

> I found two matches...

Hear must reopen voice recognition so the user can answer verbally.

---

### Scenario I — Contextual Feedback

While Story A is playing:

> I don't like this.

Resolver receives Story A as active content.

Feedback is actually submitted.

Only after backend success does Hear say:

> Feedback recorded.

---

### Scenario J — Server Content

A newly published item appears without releasing a new version of the app.

Voice search must be able to locate and play it.

---

# 56. Final Assessment

The current implementation is not missing a single isolated fix.

The remaining problems come from several layers not yet sharing one strict voice lifecycle.

The finished system must enforce this order:

```text
KNOW CURRENT SCREEN
        ↓
EXPLAIN CURRENT STATE
        ↓
WAIT FOR USER
        ↓
PREPARE VOICE SESSION
        ↓
MAKE HEAR SILENT
        ↓
LISTEN
        ↓
DO NOT INTERRUP ACTIVE SPEECH
        ↓
DETERMINE TRUE END OF UTTERANCE
        ↓
CLOSE MICROPHONE COMPLETELY
        ↓
RESOLVE WITH FULL CONTEXT
        ↓
EXECUTE REAL FEATURE
        ↓
VERIFY RESULT
        ↓
SPEAK RESULT
        ↓
RETURN TO A CLEAR ACCESSIBLE STATE
```

The core quality test is simple:

> **Hear should never compete with the user for the microphone, never silently abandon the user, never claim an action succeeded before it really did, and never require a blind user to visually discover what to do next.**

Once these issues are resolved, the voice system will have a much stronger foundation for TalkBack/VoiceOver, onboarding, long-form ASR, content playback, feedback, search, server-loaded content, and future Hear features.