# Hear! Listener — Native Screen Reader Only Accessibility & Voice Speech Coordination Plan

## Purpose

This document defines the final accessibility speech policy for the Hear! Listener app.

The objective is to stop TalkBack / VoiceOver from clashing with Hear!'s own speech and to make behavior consistent across every screen, modal, player state, voice flow, onboarding flow, feedback flow, loading state, and error state.

The central decision is:

```text
WHEN A NATIVE SCREEN READER IS ENABLED:
TALKBACK / VOICEOVER OWNS UI SPEECH.

HEAR! DOES NOT NARRATE NORMAL UI WITH APP TTS.
```

Hear! must still expose a correct accessibility tree:

```text
labels
roles
states
hints
headings
selected state
disabled state
focus order
actions
```

but it must stop manually reading those things with `expo-speech`.

This is the main fix for:

```text
double speech
button reading being cancelled
status announcements interrupting focus
TalkBack speaking partial ASR transcripts
TalkBack speaking countdown/status while the microphone is open
Hear! TTS talking at the same time as VoiceOver
ASR hearing the app/screen-reader instead of only the user
```

---

# 1. Final App-Wide Accessibility Rule

## Screen reader OFF

Hear! may use its own spoken-navigation / app-TTS system.

```text
screenReaderEnabled = false
spokenNavigationEnabled = true

-> Hear! TTS may speak
```

## Screen reader ON

Hear! does not use app TTS for routine UI narration.

```text
screenReaderEnabled = true

-> native screen reader speaks UI
-> Hear! app TTS is disabled for routine UI
```

This applies across:

```text
Home
Discover
Library
Player
Search
Settings
Onboarding
Feedback
Ambiguity
Loading screens
Empty states
Error states
Modals
Bottom sheets
Voice UI
Permissions
Playback controls
```

---

# 2. Important Clarification: Screen Reader Speaks on Accessibility Focus, Not Only Click

The app cannot configure TalkBack / VoiceOver to speak only after a user activates a control.

Native screen readers speak when accessibility focus lands on an element.

That can happen through:

```text
TalkBack swipe navigation
VoiceOver swipe navigation
touch exploration
focus restoration
programmatic accessibility focus
double-tap activation
```

The desired behavior is therefore:

```text
focus reaches element
     |
     v
native screen reader reads:
label
role
state
hint

Hear! does nothing else
```

Example:

```tsx
<Pressable
  accessible
  accessibilityRole="button"
  accessibilityLabel="Cancel"
  accessibilityHint="Stops voice listening"
  onPress={cancelVoice}
>
```

TalkBack / VoiceOver reads the element naturally.

Do not additionally call:

```ts
announce("Cancel button")
speechCoordinator.speak("Cancel")
voiceAnnounce("Cancel")
```

---

# 3. Current Problem in `AccessibilityProvider.tsx`

Current architecture allows:

```text
screen reader enabled
        |
        v
AccessibilityProvider
        |
        v
speechCoordinator
        |
        v
expo-speech
```

This makes Hear! speak even though TalkBack / VoiceOver is already speaking.

That behavior must be removed.

## New policy

`AccessibilityProvider` should detect:

```ts
AccessibilityInfo.isScreenReaderEnabled()
```

and maintain:

```ts
screenReaderEnabled
```

When true:

```text
do not use Hear! TTS for routine UI narration
```

When false and spoken navigation is enabled:

```text
Hear! TTS may narrate
```

---

# 4. Remove Routine Manual Screen-Reader Announcements

Across the entire app, remove or heavily restrict routine calls to:

```ts
AccessibilityInfo.announceForAccessibility(...)
```

and:

```ts
AccessibilityInfo.announceForAccessibilityWithOptions(...)
```

for normal screen behavior.

Examples that should normally NOT be manually announced:

```text
Home
Settings
Play
Pause
Cancel
Back
Next
Previous
Loading
Listening
Working
Done
Screen titles that already receive focus
button labels
focused row names
selected tabs
ordinary route changes
```

These should be represented in the accessibility tree instead.

---

# 5. Manual Announcements Become Exceptions

Manual native screen-reader announcements should only be used when important information is not otherwise exposed through focus/state.

Allowed examples:

```text
critical operation failed and focus cannot move safely
permission was denied and there is no focused explanatory control
destructive action requires immediate confirmation
background action completes but no visible/focusable state changes
```

Even then:

```text
announce exactly once
```

Do not announce the same message through:

```text
native announcement
+
live region
+
Hear! TTS
```

---

# 6. Fix `speech-coordinator.ts`

`speechCoordinator` must know whether a native screen reader is enabled.

Add:

```ts
private screenReaderEnabled = false;

setScreenReaderEnabled(enabled: boolean) {
  this.screenReaderEnabled = enabled;
}
```

Routine TTS rule:

```ts
if (this.screenReaderEnabled) {
  return;
}
```

for:

```text
screen narration
button narration
navigation narration
loading narration
routine results
routine errors already represented in UI
```

Only no-screen-reader mode may use Hear! TTS for those.

---

# 7. Remove `interrupt: true` as the Default Behavior

Current app TTS behavior can interrupt other speech.

Do not make:

```ts
interrupt: true
```

the default for every message.

Create explicit priorities:

```ts
type SpeechPriority =
  | "background"
  | "screen"
  | "prompt"
  | "critical";
```

Suggested behavior when screen reader is OFF:

```text
background
  -> queue or drop duplicate

screen
  -> queue/dedupe

prompt
  -> stop previous Hear! TTS if necessary

critical
  -> may interrupt Hear! TTS
```

When screen reader is ON:

```text
all routine Hear! TTS priorities -> suppressed
```

This prevents a Hear! status message from cutting off TalkBack's focused button speech.

---

# 8. Button Reading Cancellation — Exact Fix

Observed user problem:

```text
TalkBack starts:
"Cancel, button..."

then another Hear! event fires

button speech stops
```

Possible competing sources include:

```text
Hear! app TTS
live region changes
status changes
partial transcript changes
focus movement
duplicate accessibility announcements
```

The fix is:

```text
1. native screen reader owns button speech
2. no Hear! TTS when screen reader is enabled
3. no routine live-region updates while focus is being used
4. no duplicate manual announcement of the focused button
5. avoid unnecessary programmatic focus changes
```

---

# 9. Correct Button Accessibility Pattern

Every real interactive control should expose native semantics.

Example:

```tsx
<Pressable
  accessible
  accessibilityRole="button"
  accessibilityLabel="Cancel"
  accessibilityHint="Stops voice listening and closes the voice panel."
  accessibilityState={{
    disabled: isDisabled,
  }}
  disabled={isDisabled}
  onPress={cancelVoice}
>
  ...
</Pressable>
```

Do not add:

```ts
onFocus={() => speak("Cancel")}
```

Do not add:

```ts
onPress={() => {
  speak("Cancel");
  cancelVoice();
}}
```

unless no screen reader is active and app spoken-navigation explicitly requires action feedback.

---

# 10. Focus Order Must Be Stable

Across all screens:

```text
do not move accessibility focus on every render
do not remount focused controls unnecessarily
do not replace a focused button with another node during transient state changes
```

Use stable component identity.

Avoid:

```tsx
{loading ? <LoadingButton /> : <PlayButton />}
```

if it causes the accessible control identity to disappear repeatedly.

Prefer stable control when possible:

```tsx
<Pressable
  accessibilityState={{ disabled: loading }}
  accessibilityLabel={loading ? "Loading" : "Play"}
>
```

but avoid changing the label repeatedly while focused unless the state meaningfully changed.

---

# 11. Live Regions — New App-Wide Policy

Default rule:

```text
NO live region unless there is a strong accessibility reason.
```

Do not use `accessibilityLiveRegion="polite"` as a general convenience.

Live regions can interrupt TalkBack focus speech.

Only use them when:

```text
important content changes without focus moving
AND
the user must know immediately
AND
there is no better focus/state mechanism
```

---

# 12. Voice UI Must Have No Live-Region Chatter During Capture

While:

```text
preparing
opening microphone
waiting for speech
speech active
```

do not live-announce:

```text
Listening
Speak naturally
I can hear you
partial transcript
countdown
status badge
microphone state
```

Use:

```tsx
accessibilityLiveRegion="none"
```

or omit the property.

For dynamic transcript elements:

```tsx
importantForAccessibility={
  voiceCaptureActive ? "no" : "auto"
}
```

Where a whole container is purely transient voice telemetry:

```tsx
importantForAccessibility={
  voiceCaptureActive ? "no-hide-descendants" : "auto"
}
```

Use this only on the transient voice UI, never the entire app screen.

---

# 13. `GlobalVoiceDock.tsx` Fix

During active voice capture, the changing transcript must not be announced.

Bad:

```tsx
<AppText
  accessibilityLiveRegion="polite"
>
  {voice.transcript}
</AppText>
```

Correct concept:

```tsx
<AppText
  accessibilityLiveRegion="none"
  importantForAccessibility={
    voiceCaptureActive ? "no" : "auto"
  }
>
  {voice.transcript}
</AppText>
```

The transcript may remain visually visible.

It must not chatter through TalkBack while ASR is listening.

---

# 14. `ListeningPanel.tsx` Fix

Remove live announcements during:

```text
listening
speech-active
```

Expose final states normally after capture finishes.

Example:

```tsx
accessibilityLiveRegion={
  voiceCaptureActive ? "none" : "polite"
}
```

But even after capture, prefer:

```text
focusable status
or
result content
```

over a live region if practical.

---

# 15. `ListeningCountdown.tsx` Fix

The countdown is visual/haptic during capture.

Do not let TalkBack continuously read:

```text
7 seconds
6 seconds
5 seconds
...
```

During active capture:

```tsx
accessible={false}
importantForAccessibility="no"
```

or hide only the changing countdown values.

Keep:

```text
4-second haptic reminder
```

for blind users.

The countdown must not become another spoken audio source while the user is trying to talk.

---

# 16. `VoiceStatusBadge.tsx` Fix

Do not expose rapidly changing capture states as screen-reader speech.

Examples:

```text
GETTING READY
LISTENING
I CAN HEAR YOU
WORKING
```

During capture:

```text
hide transient status from accessibility announcements
```

After capture:

```text
final error/result may become naturally accessible
```

---

# 17. Voice Capture Is a Strict No-Speech Zone

When native ASR is accepting user speech:

```text
Hear! TTS                        = OFF
routine TalkBack manual announce = OFF
routine VoiceOver manual announce= OFF
live regions                     = OFF
partial transcript announcements = OFF
countdown announcements          = OFF
status announcements             = OFF
player audio                      = paused/ducked per policy
```

Allowed:

```text
visual state
haptic
short nonverbal earcon
```

The microphone should hear the user, not the app.

---

# 18. Voice Start Sequence

Recommended sequence:

```text
user invokes Hear voice
        |
        v
snapshot current screen
        |
        v
pause/duck player audio
        |
        v
stop Hear! app TTS
        |
        v
suppress app-generated accessibility announcements
        |
        v
finish any intentional pre-capture prompt
        |
        v
open native ASR
        |
        v
native ready/start
        |
        v
short haptic / earcon
        |
        v
start 8-second PRE-SPEECH timer
```

Do not speak new app TTS after the microphone is actively accepting speech.

---

# 19. "Speak Now" Policy

If Hear! needs a spoken prompt:

```text
say it BEFORE active microphone capture
```

Then use:

```text
haptic
or
short nonverbal earcon
```

when the recognizer becomes ready.

This prevents:

```text
Hear! says "Speak now"
        |
microphone hears "Speak now"
```

---

# 20. 8-Second Rule

The 8 seconds means:

```text
time allowed for user to BEGIN speaking
```

It is not:

```text
maximum speech duration
```

and not:

```text
post-speech silence duration
```

Correct:

```text
native ASR ready
        |
        v
8-second timer begins
        |
        +--> no user speech -> no-speech flow
        |
        +--> user starts speaking
                 |
                 v
             timer cancelled permanently
```

---

# 21. When Screen Reader Is ON During Normal Navigation

Normal behavior:

```text
user swipes to a button
        |
        v
TalkBack / VoiceOver reads the button

Hear! TTS remains silent
```

User activates:

```text
screen reader performs native activation
        |
        v
app handles onPress
        |
        v
next screen/state becomes accessible naturally
```

Do not manually narrate:

```text
"Opening settings"
"Selected play"
"Cancel button"
```

unless there is a specific product requirement and no accessible state change.

---

# 22. Navigation Behavior

When navigating:

```text
Home -> Settings
```

prefer:

```text
new screen renders
        |
        v
appropriate heading / first logical element receives accessibility focus
        |
        v
TalkBack / VoiceOver reads it naturally
```

Do not also call:

```ts
voiceAnnounce("Opening Settings")
```

when a screen reader is enabled.

---

# 23. Focus Restoration

For:

```text
modal opens
modal closes
bottom sheet opens
bottom sheet closes
voice overlay opens/closes
```

focus must return to a sensible control.

Example:

```text
user activates "Voice"
        |
        v
voice overlay
        |
        v
cancel / complete
        |
        v
focus returns to original voice trigger or current logical destination
```

Do not move focus repeatedly during transient voice states.

---

# 24. Modal Accessibility

When modal is open:

```text
background content should not remain in the active accessibility traversal
```

Use appropriate React Native modal/accessibility containment behavior.

Do not hide the entire app from accessibility permanently.

Only the active modal scope should be traversable while modal interaction owns focus.

---

# 25. Loading States

Screen reader enabled:

```text
do not have Hear! TTS say "Loading"
```

If loading affects a control:

```text
accessibilityState={{ busy: true }}
```

where supported / appropriate.

If a full-screen loading state genuinely needs notification:

```text
use one accessible state/heading
```

not repeated live announcements.

Do not announce every network progress update.

---

# 26. Empty States

Expose:

```text
heading
description
available action
```

Example:

```text
"No saved publications"
"Items you save will appear here."
"Browse publications, button"
```

Let screen reader read them through normal focus traversal.

Do not independently speak the same empty-state copy through Hear! TTS when screen reader is enabled.

---

# 27. Error States

Prefer:

```text
visible/focusable error content
+
Retry button
```

Screen reader naturally reaches/reads it.

Only use a manual accessibility announcement if:

```text
error is critical
AND
focus cannot be meaningfully moved
AND
the user otherwise would not know
```

Never duplicate:

```text
manual announce
+
live region
+
Hear TTS
```

---

# 28. Success States

Avoid unnecessary:

```text
"Done"
"Success"
"Opened"
```

announcements when the resulting screen/state itself is obvious through focus.

Examples:

```text
Play command starts audio
-> playback audio itself is feedback

Open Settings
-> Settings heading becomes focused/read

Pause
-> button state becomes "Play" / playback stops
```

---

# 29. Playback Controls

Controls should expose:

```tsx
accessibilityRole="button"
accessibilityLabel="Pause"
accessibilityState={{ disabled: false }}
```

When paused:

```tsx
accessibilityLabel="Play"
```

Do not have Hear! TTS separately say:

```text
"Pause button"
```

when screen reader is enabled.

---

# 30. Toggle / Selection Controls

Use native state semantics.

Examples:

```tsx
accessibilityRole="switch"
accessibilityState={{ checked: enabled }}
```

or:

```tsx
accessibilityState={{ selected: true }}
```

Let TalkBack / VoiceOver speak:

```text
selected
on
off
disabled
```

Do not manually narrate those states.

---

# 31. Headings

Use:

```tsx
accessibilityRole="header"
```

for true screen headings.

Do not use `header` simply because text is visually large.

Do not continuously mutate header text during active voice capture.

---

# 32. Decorative Content

Hide purely decorative elements:

```tsx
accessible={false}
importantForAccessibility="no"
```

Examples:

```text
decorative icons
waveform animation
background artwork
purely visual progress ornament
```

Do not hide meaningful controls.

---

# 33. Screen Reader OFF + Spoken Navigation ON

This is where Hear!'s own TTS remains useful.

Possible app speech:

```text
screen introduction
important status
voice instructions
errors
results
help
```

But still use:

```text
deduplication
queueing
priority
```

and avoid speaking every visual change.

---

# 34. Screen Reader Turns ON While App Is Running

Listen for:

```ts
AccessibilityInfo.addEventListener(
  "screenReaderChanged",
  ...
)
```

When enabled:

```text
immediately stop Hear! routine TTS
switch speech owner to native screen reader
remove/suppress app routine narration
keep accessibility tree enabled
```

Do not require app restart.

---

# 35. Screen Reader Turns OFF While App Is Running

If Hear! spoken navigation is enabled:

```text
native screen reader off
        |
        v
Hear! TTS may become the speech owner again
```

Do not replay previous messages.

Only future app speech follows the new mode.

---

# 36. `voiceAnnounce()` New Policy

Current utility must not blindly speak.

Conceptual behavior:

```ts
async function voiceAnnounce(message: string) {
  if (voiceCaptureActive) {
    return;
  }

  if (screenReaderEnabled) {
    // Routine UI messages: do not manually announce.
    return;
  }

  if (spokenNavigationEnabled) {
    await speechCoordinator.announce(...);
  }
}
```

For rare critical screen-reader announcements, use a separate explicit function:

```ts
announceCriticalForScreenReader(...)
```

so normal code cannot accidentally trigger native announcements.

---

# 37. Separate Routine and Critical Announcement APIs

Recommended:

```ts
announceAppSpeech(message)
```

for Hear TTS when no native screen reader is enabled.

And:

```ts
announceCriticalAccessibility(message)
```

for rare native screen-reader announcements.

Do not use one generic `announce()` function for everything.

This makes misuse harder.

---

# 38. `audio-gate.ts`

Current gate should become a full capture speech gate.

Suggested state:

```ts
type SpeechGateState = {
  voiceCaptureActive: boolean;
  blockHearTts: boolean;
  blockRoutineAccessibilityAnnouncements: boolean;
  suppressDynamicLiveRegions: boolean;
};
```

Set:

```text
voice capture active
-> all three blocks true
```

---

# 39. `VoiceProvider.tsx`

`VoiceProvider` must coordinate lifecycle but should not directly narrate every state.

Required sequence:

```text
before recognition:
  stop Hear TTS
  pause/duck player
  enter capture speech gate

native ready:
  haptic/earcon
  start 8-second pre-speech timer

speech starts:
  cancel pre-speech timer

final/error/end:
  close recognizer
  exit capture speech gate
  restore player/audio state if appropriate
```

No routine TalkBack/VoiceOver announcement should be emitted during capture.

---

# 40. Cancel Behavior

Cancel must be deterministic.

If screen reader focus is on Cancel:

```text
TalkBack / VoiceOver reads:
"Cancel, button. Stops voice listening."
```

On activation:

```text
1. mark session cancelled
2. stop native ASR
3. clear timers
4. suppress stale callbacks using session/request ID
5. close voice overlay
6. restore normal accessibility mode
7. restore focus to the voice trigger / logical previous element
8. do not speak duplicate "Cancelled" unless necessary
```

This prevents:

```text
Cancel gets read
then app TTS interrupts
then overlay closes
then stale ASR result speaks
```

---

# 41. Stale Callback Protection

Every native ASR callback must carry/check:

```text
sessionId
```

When Cancel occurs:

```text
session becomes inactive
```

Later partial/final callbacks from the old recognizer:

```text
must be ignored
```

Otherwise a cancelled session can still update the transcript/live region/result.

---

# 42. Screen Reader + Voice Command Result

Example:

```text
TalkBack enabled
user says "open settings"
```

Correct behavior:

```text
capture quiet
        |
ASR resolves
        |
navigate to Settings
        |
microphone closed
        |
Settings heading becomes accessibility focus
        |
TalkBack reads Settings naturally
```

Incorrect:

```text
Hear TTS: "Opening settings"
+
TalkBack: "Settings, heading"
```

---

# 43. Screen Reader + Playback Command

Example:

```text
user says "pause"
```

Correct:

```text
voice capture
-> resolve local command
-> pause playback
-> close voice capture
-> update button state to "Play"
```

TalkBack does not need an extra app-TTS message.

If no obvious state feedback exists, a single critical/native announcement can be considered, but not by default.

---

# 44. Screen Reader + Error

Example:

```text
voice command unresolved
```

Correct:

```text
close microphone
show accessible error content:
"I couldn't find that."
"Try again, button"
```

Move focus only if appropriate.

TalkBack reads the error UI naturally.

Do not also have Hear! TTS read the same error.

---

# 45. Screen Reader + Ambiguity

Ambiguity UI exposes:

```text
choice name
position
selected state
Select button/action
```

TalkBack / VoiceOver can traverse options normally.

Voice/tilt/gesture ambiguity navigation may still work.

Do not live-announce every internal cursor movement if the user is actively exploring with the screen reader.

If gesture selection changes a hidden/internal choice, then one controlled accessibility state/focus update may be needed.

---

# 46. Screen Reader + Feedback

Feedback choices expose proper roles/states.

Example:

```text
Helpful, radio button, selected
Not helpful, radio button
```

Do not have Hear! TTS speak each option while screen reader is enabled.

---

# 47. Onboarding

The same rules apply.

When TalkBack / VoiceOver is on:

```text
native screen reader reads controls/instructions
Hear! does not duplicate the page copy through app TTS
```

Voice-training prompts may still use controlled pre-capture speech if the product explicitly requires it, but:

```text
prompt finishes
then microphone opens
then silence
```

---

# 48. Permission Dialogs

Before native permission UI:

```text
if screen reader enabled:
  rely on native system accessibility

if no screen reader + Hear spoken guidance:
  Hear may explain before opening dialog
```

Once the native permission dialog opens:

```text
Hear stays silent
```

Do not compete with Android/iOS system accessibility speech.

---

# 49. Android TalkBack Policy

Do NOT attempt to disable TalkBack.

Do NOT hide the whole app from TalkBack.

Do NOT remove accessibility labels/roles.

Do:

```text
remove duplicate app speech
remove unnecessary live regions
suppress transient capture UI
keep native accessible controls
let TalkBack own focus speech
```

---

# 50. iOS VoiceOver Policy

Same application-level policy:

```text
VoiceOver enabled
-> native VoiceOver owns UI narration
-> Hear TTS routine narration disabled
```

Do not make iOS behavior semantically different from Android.

Platform implementation details may differ, but product behavior is the same.

---

# 51. No Need to Pause Native Screen Reader for Normal UI

The preferred design is not to pause/disable TalkBack/VoiceOver across the app.

The main conflict is caused by app-generated speech and live regions.

Fix those first.

During active voice capture:

```text
suppress Hear-generated announcements
suppress transient accessibility live-region content
```

Do not rely on turning the screen reader off.

---

# 52. Native Assistive-Speech Interruption — Optional, Not Core

If testing still shows native screen-reader speech continuing into active capture after the app removes duplicate announcements, a narrow native helper may be considered.

Android:

```text
AccessibilityManager.interrupt()
```

can request interruption of current accessibility feedback.

iOS:

```text
pause/resume assistive technology
```

may be available through native accessibility APIs.

These should be:

```text
last-mile capture coordination
```

not the main architecture.

The app must still work correctly without them.

---

# 53. Component Audit Required Across the Entire App

Search for:

```text
announceForAccessibility
announceForAccessibilityWithOptions
accessibilityLiveRegion
expo-speech
speechCoordinator
voiceAnnounce
onFocus
setAccessibilityFocus
importantForAccessibility
accessibilityElementsHidden
accessible=
accessibilityLabel
accessibilityHint
accessibilityRole
accessibilityState
```

Every occurrence must be classified.

Categories:

```text
KEEP
REMOVE
CHANGE
CAPTURE-ONLY SUPPRESSION
CRITICAL-ANNOUNCEMENT EXCEPTION
```

---

# 54. Files to Audit First

Priority:

```text
src/providers/AccessibilityProvider.tsx
src/providers/VoiceProvider.tsx

src/services/voice/speech-coordinator.ts
src/services/voice/audio-gate.ts
src/services/voice/announce.ts

src/components/voice/GlobalVoiceDock.tsx
src/components/voice/ListeningPanel.tsx
src/components/voice/ListeningCountdown.tsx
src/components/voice/VoiceStatusBadge.tsx

all shared Button components
all navigation/header components
all modal/bottom-sheet components
player controls
settings controls
onboarding screens
feedback screens
ambiguity UI
```

---

# 55. Recommended New File

Add:

```text
src/services/accessibility/accessibility-speech-policy.ts
```

Suggested API:

```ts
export type AccessibilitySpeechPolicy = {
  screenReaderEnabled: boolean;
  spokenNavigationEnabled: boolean;
  voiceCaptureActive: boolean;

  canUseHearTts: boolean;
  canUseRoutineNativeAnnouncement: boolean;
  suppressDynamicAccessibility: boolean;
};
```

Derived rules:

```ts
canUseHearTts =
  !screenReaderEnabled &&
  spokenNavigationEnabled &&
  !voiceCaptureActive;

canUseRoutineNativeAnnouncement = false;

suppressDynamicAccessibility =
  voiceCaptureActive;
```

---

# 56. Architecture Invariants

## Invariant 1

```text
Native screen reader ON
=> no routine Hear UI TTS.
```

## Invariant 2

```text
A focused control is read by TalkBack / VoiceOver only.
```

## Invariant 3

```text
Never manually narrate a control because it received accessibility focus.
```

## Invariant 4

```text
Voice capture active
=> no speech output from Hear.
```

## Invariant 5

```text
Partial ASR text is never announced.
```

## Invariant 6

```text
Countdown/status capture telemetry is never spoken.
```

## Invariant 7

```text
Manual native accessibility announcements are exceptional.
```

## Invariant 8

```text
No message is delivered through both Hear TTS and native screen-reader announcement.
```

## Invariant 9

```text
Cancel invalidates the voice session before UI/focus restoration.
```

## Invariant 10

```text
TalkBack / VoiceOver remains enabled and supported throughout the app.
```

---

# 57. Testing Matrix

Test with:

```text
TalkBack OFF
TalkBack ON

VoiceOver OFF
VoiceOver ON

Hear spoken navigation OFF
Hear spoken navigation ON
```

Scenarios:

```text
focus Cancel button
focus Play button
swipe through Home
swipe through Settings
open/close modal
open/close voice overlay
start voice capture
speak immediately
speak near 8-second deadline
cancel during capture
ASR partial results
ASR final result
ASR error
navigation result
playback result
loading
empty screen
network error
permission dialog
feedback
ambiguity
Bluetooth audio
headphones
speaker
```

---

# 58. Specific Button Regression Tests

## Cancel button

Expected:

```text
TalkBack focuses Cancel
-> reads full label/role/hint
-> no Hear TTS interrupts
```

## Play button

Expected:

```text
TalkBack reads Play completely
-> no live-region status interrupts
```

## Rapid focus navigation

Expected:

```text
user swipes quickly across controls
-> screen reader owns all speech
-> Hear TTS remains silent
```

## State change while focused

Expected:

```text
control changes state
-> native accessible state updates
-> no duplicate Hear narration
```

---

# 59. Voice-Capture Regression Test

With TalkBack enabled:

```text
1. Focus Voice button.
2. TalkBack reads it.
3. Activate voice.
4. Hear TTS does not start routine narration.
5. Voice capture UI opens.
6. No transcript/live-region/countdown speech occurs.
7. Haptic/earcon indicates readiness.
8. User speaks.
9. ASR hears user without app speech contamination.
10. Capture closes.
11. Result screen/state becomes accessible normally.
12. TalkBack resumes normal focus behavior.
```

---

# 60. Definition of Done

- [ ] TalkBack/VoiceOver remains supported across every app screen.
- [ ] Hear! does not attempt to disable the native screen reader.
- [ ] Routine Hear! TTS is disabled when a native screen reader is enabled.
- [ ] Buttons are read only through native accessibility focus.
- [ ] No `onFocus` handler manually speaks a button label.
- [ ] Cancel button reading is not interrupted by Hear speech.
- [ ] Shared button components expose correct role/label/state/hint.
- [ ] Routine `announceForAccessibility` calls are removed.
- [ ] Manual native announcements are limited to explicit critical exceptions.
- [ ] Unnecessary `accessibilityLiveRegion` usages are removed.
- [ ] Partial ASR transcript is hidden from screen-reader announcements during capture.
- [ ] Countdown is not spoken during capture.
- [ ] Voice status badge is not spoken during capture.
- [ ] Hear TTS is fully blocked while microphone capture is active.
- [ ] App does not speak "Speak now" after active capture begins.
- [ ] Haptic/earcon can signal microphone readiness.
- [ ] The 8-second timer remains a speech-start timer only.
- [ ] Voice cancel invalidates stale ASR callbacks.
- [ ] Focus restores sensibly after modal/voice/cancel flows.
- [ ] Loading/empty/error states use native accessibility semantics.
- [ ] Player controls expose correct native states.
- [ ] TalkBack and VoiceOver receive equivalent product behavior.
- [ ] App-wide accessibility call sites are audited.
- [ ] Accessibility tests cover all major screens and overlays.
- [ ] No message is simultaneously spoken by Hear TTS and TalkBack/VoiceOver.

---

# 61. Implementation Order

```text
1. Add `accessibility-speech-policy.ts`.

2. Update AccessibilityProvider:
   - detect screen reader
   - suppress routine Hear TTS when enabled
   - remove duplicate narration behavior

3. Update speechCoordinator:
   - screen-reader-aware
   - no routine TTS when native screen reader is on
   - stop default interrupt-everything behavior

4. Split announcement API:
   - app speech
   - rare critical native announcement

5. Audit `voiceAnnounce()`.

6. Update audio-gate:
   - voiceCaptureActive
   - blockHearTts
   - blockRoutineAccessibilityAnnouncements
   - suppressDynamicAccessibility

7. Update VoiceProvider:
   - strict capture gate lifecycle
   - no app speech during microphone capture
   - stale callback/session protection

8. Fix GlobalVoiceDock:
   - remove listening live-region behavior
   - hide partial transcript from accessibility during capture

9. Fix ListeningPanel.

10. Fix ListeningCountdown.

11. Fix VoiceStatusBadge.

12. Audit shared Button components.

13. Remove manual onFocus speech.

14. Audit navigation/focus restoration.

15. Audit modals/bottom sheets.

16. Audit loading/empty/error states.

17. Audit player controls.

18. Audit onboarding.

19. Audit feedback/ambiguity.

20. Run full TalkBack and VoiceOver regression suite.
```

---

# 62. Final Product Behavior

## Native screen reader OFF

```text
Hear! may speak UI guidance using app TTS.
```

## Native screen reader ON

```text
Hear! stays silent for normal UI narration.

TalkBack / VoiceOver reads:
- focused controls
- headings
- states
- hints
- selected values
- disabled values
```

## Voice capture active

```text
NO Hear TTS
NO transcript announcements
NO countdown announcements
NO status announcements
NO routine live regions

User speaks in a quiet capture window.
```

## Capture ends

```text
normal accessibility behavior resumes.

Resulting UI/focus is read by TalkBack / VoiceOver naturally.
```

---

# Final Rule

```text
DO NOT REMOVE ACCESSIBILITY.

REMOVE DUPLICATE SPEECH.
```

The native accessibility tree stays.

TalkBack / VoiceOver stays.

Hear! app TTS stays available for users who do not have a screen reader enabled.

What disappears is the overlapping custom narration that currently causes:

```text
double speech
cancelled button reading
ASR contamination
confusing focus announcements
```

That is the correct long-term accessibility architecture for Hear! Listener.
