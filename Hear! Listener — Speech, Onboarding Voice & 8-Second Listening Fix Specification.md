# Hear! Listener — Speech, Onboarding Voice & 8-Second Listening Fix Specification

## 1. Main Problem

Hear is an accessibility-first, voice-invocation application.

A blind user must never enter a new screen or voice state and be left wondering:

- where they are;
- whether Hear is listening;
- whether a command worked;
- whether permission was granted;
- whether something failed;
- whether the microphone closed;
- how to start listening again.

The current implementation does not guarantee this.

The fix is not just a UI change.

We need to fix the **speech lifecycle, onboarding state transitions, listening timer, TalkBack behaviour, screen announcements, and voice-session completion sequence**.

---

# 2. Required User Experience

The application must always follow this pattern:

```text
STATE CHANGES
      ↓
Hear determines what changed
      ↓
Hear gives audio/haptic feedback
      ↓
Hear announces what the new state means
      ↓
If microphone should start:
WAIT UNTIL SPEECH IS FINISHED
      ↓
Listening tone
      ↓
Start ASR
```

For every screen:

```text
SCREEN GAINS FOCUS
      ↓
Announce screen
      ↓
Tell user what can be done
```

For every failure:

```text
FAILURE OCCURS
      ↓
Stop microphone if necessary
      ↓
Error haptic/sound
      ↓
Speak what failed
      ↓
Speak exactly how to recover
```

There must be no silent state transition.

---

# 3. Fix Screen Speech First

The current onboarding must stop using `onLayout` as the mechanism for announcing screens.

This:

```tsx
<View onLayout={setup.announceCurrent}>
```

must no longer control onboarding speech.

Layout events describe visual layout.

They do not describe navigation state.

A screen can change without that parent layout happening again.

Instead:

```text
ONBOARDING STATE CHANGED
       ↓
ANNOUNCE THAT STATE
```

Use an effect driven by the actual onboarding state.

Conceptually:

```ts
useEffect(() => {
  void announceOnboardingState(screen, phase);
}, [screen, phase]);
```

The announcement must happen because:

```text
welcome became active

voicePermission became active

permissionDenied became active

voiceTest became active

voiceTestError became active

account became active
```

not because React Native happened to calculate layout.

---

# 4. Create One Onboarding Announcement Function

Create:

```ts
announceOnboardingState(state)
```

or:

```ts
speakOnboardingState(screen, phase)
```

This becomes the only authority for onboarding screen narration.

Example:

```ts
function getOnboardingAnnouncement(
  screen: OnboardingScreenId,
  phase: OnboardingPhase,
): string {
  if (screen === "welcome") {
    return "Welcome to Hear. Step 1 of 3. Double-tap anywhere to continue.";
  }

  if (phase === "permissionPrimer") {
    return "Voice access. Step 2 of 3. Hear listens only when you ask. Double-tap anywhere to request microphone access.";
  }

  if (phase === "permissionDenied") {
    return "Voice access. Step 2 of 3. Microphone access is off. Double-tap anywhere to open Settings.";
  }

  if (phase === "voiceTestReady") {
    return "Microphone access is on. After the tone, say Play my local news.";
  }

  if (screen === "account") {
    return "Optional account. Step 3 of 3. Say Apple, Google, or Not now.";
  }

  return "";
}
```

---

# 5. Onboarding Speech Must Not Depend on a Preference Race

Onboarding guidance is mandatory.

It must not depend on:

```text
spokenGuidanceEnabled
```

already being updated in Zustand before the first announcement.

Current behaviour effectively does:

```text
enable spoken guidance
↓
immediately request speech
```

React/store consumers may still be using the previous value during that call.

Instead, onboarding needs a **forced announcement path**.

For example:

```ts
speechCoordinator.announce({
  key,
  text,
  priority: "instruction",
  force: true,
});
```

`force: true` means:

```text
This is required accessibility guidance.

Do not suppress it because the normal spoken-guidance preference has not hydrated yet.
```

After onboarding completes, ordinary app guidance can respect the user's settings.

---

# 6. Speech Coordinator Needs Two Different Jobs

There are two different types of speech.

### Screen accessibility announcements

Examples:

```text
Home.

Discover.

Optional account. Step 3 of 3.
```

When TalkBack/VoiceOver is enabled, these may use the operating system's accessibility announcement system.

### Speech immediately before ASR

Examples:

```text
After the tone, say Play my local news.
```

This is different.

The app MUST know when this speech has finished before opening the microphone.

Therefore create a blocking speech method:

```ts
await speechCoordinator.speakBeforeListening({
  text: "After the tone, say Play my local news.",
});
```

This method must have an actual completion callback.

Flow:

```text
Hear TTS starts
      ↓
onDone/onStopped callback
      ↓
small safety delay
      ↓
tone
      ↓
ASR
```

Do not assume:

```ts
AccessibilityInfo.announceForAccessibility(...)
```

has completed speaking simply because the JavaScript call returned.

It does not provide a reliable TTS-completion contract.

---

# 7. Step 1 — Welcome

When Welcome becomes active:

```text
STATE = welcome
```

Automatically announce:

> Welcome to Hear. Step 1 of 3. Hear will guide you through setup. Double-tap anywhere to continue.

Visual indicator:

```text
● HEAR IS SPEAKING
```

The dot should pulse while Hear speech is active.

After speech finishes:

```text
● becomes inactive/static
```

User double taps anywhere.

Then:

```text
short click
+
haptic
↓
Voice Access
```

Voice Access must announce automatically.

---

# 8. Step 2 — Voice Permission

When Step 2 appears:

> Voice access. Step 2 of 3. Hear listens only when you ask. Double-tap anywhere to request microphone access.

The whole screen remains the primary action.

No visual button needs to be found.

Double tap:

```text
haptic
↓
stop current Hear speech
↓
request native permission
```

---

# 9. Permission Granted

As soon as permission returns as granted:

```text
permission = GRANTED
```

Do not silently change the UI.

Play:

```text
success haptic
+
short success tone
```

Then speak:

> Microphone access granted. Let's try one command. After the tone, say Play my local news.

The voice-test UI appears while this speech is playing.

But:

```text
ASR = OFF
```

until that sentence completely finishes.

Then:

```text
speech completed
↓
100–250 ms audio transition
↓
listening tone
↓
ASR starts
↓
8-second countdown begins
```

---

# 10. Listening Header Must Be Obvious

The listening panel must contain:

```text
● LISTENING                  8s ◯
```

The left indicator:

```text
●
```

must be a clearly visible pulsing dot.

Recommended:

```text
size: 10–12 px

state = listening:
pulse opacity 1 → 0.35 → 1

state != listening:
stop pulse
```

The dot is state feedback.

It must not be decorative.

---

# 11. Add a Circular 8-Second Countdown

Add a reusable component:

```text
ListeningCountdown
```

Use `react-native-svg`, which is already available in the project.

Example:

```text
      ╭────╮
      │ 8s │
      ╰────╯
```

As time passes:

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

and the circular stroke decreases.

Recommended component interface:

```ts
<ListeningCountdown
  durationMs={8000}
  deadlineAt={voice.listeningDeadlineAt}
/>
```

Do NOT create an independent 8-second timer in every UI component.

---

# 12. VoiceProvider Must Own the Deadline

The provider already owns the actual no-speech timeout.

Expose:

```ts
listeningStartedAt
listeningDeadlineAt
```

When listening begins:

```ts
const startedAt = Date.now();

setVoice({
  state: "listening",
  listeningStartedAt: startedAt,
  listeningDeadlineAt:
    startedAt + VOICE_TIMING.noSpeechTimeout,
});
```

The UI derives:

```ts
remainingMs = deadlineAt - Date.now();
remainingSeconds = Math.ceil(remainingMs / 1000);
```

This ensures:

```text
ASR timer
and
visual countdown
```

cannot drift apart.

---

# 13. Accessible Countdown

The countdown should also expose:

```tsx
accessibilityRole="progressbar"

accessibilityValue={{
  min: 0,
  max: 8,
  now: remainingSeconds,
  text: `${remainingSeconds} seconds remaining`
}}
```

However:

**Do not automatically speak 8, 7, 6, 5, 4... while ASR is listening.**

That would put speech into the microphone and make recognition worse.

For blind users, listening state is communicated using:

```text
listening tone
+
haptic
+
TalkBack accessible progress information when focused
+
timeout announcement after microphone closes
```

---

# 14. 4-Second Reminder

There is currently a 4-second reminder in the voice provider, but it only changes UI text.

That is insufficient for a blind user.

At 4 seconds with no detected speech:

```text
DO NOT speak a sentence through TTS while ASR is still open.
```

Instead use a short non-speech reminder.

Recommended:

```text
soft double tick
+
very light haptic
```

Meaning:

> Hear is still listening.

The visual message can simultaneously change to:

```text
Still listening…
4 seconds remaining
```

But no TTS should contaminate the microphone.

---

# 15. Speech Detection Stops the No-Speech Countdown

As soon as:

```text
speechstart
```

occurs:

```text
speechDetected = true
```

Stop the no-speech 8-second timer.

The countdown ring should change mode.

For example:

```text
● LISTENING

I can hear you.
```

The 8-second **no-speech** countdown is no longer relevant once speech has begun.

Then use the speech recognizer's own end-of-speech behaviour.

---

# 16. 8-Second Timeout Behaviour

If 8 seconds pass with:

```text
speechDetected = false
```

the order MUST be:

```text
8 seconds reached
      ↓
stop ASR
      ↓
confirm microphone has closed
      ↓
stop countdown animation
      ↓
error/timeout haptic
      ↓
close listening state
      ↓
speak recovery instruction
```

Required speech:

> I didn't hear anything. Voice listening is closed. Double-tap anywhere when you're ready to speak again.

For onboarding voice test:

> I didn't hear anything. Double-tap anywhere to try again. After the tone, say Play my local news.

This speech happens **after the microphone is closed**.

---

# 17. Do Not Send Voice-Test Timeout Back to Permission Screen

The current logical behaviour must not be:

```text
Voice Test
↓
No speech
↓
Voice Permission screen
```

That makes no sense because permission has already been granted.

Instead:

```text
VOICE TEST
↓
NO SPEECH
↓
VOICE TEST ERROR/READY
```

Remain visually on:

```text
VOICE ACCESS · 2 OF 3

Let's try one command.
```

The panel changes from:

```text
● LISTENING
```

to:

```text
TRY AGAIN
```

and Hear says:

> I didn't hear anything. Double-tap anywhere to speak again.

---

# 18. Retry Must Be Double-Tap Anywhere

After timeout:

```text
current onboarding gesture =
retryVoiceTest
```

Then:

```text
DOUBLE TAP ANYWHERE
       ↓
haptic
       ↓
listening tone
       ↓
8-second timer reset to 8
       ↓
ASR starts
```

No retry button is necessary for the core blind-user experience.

---

# 19. When “Play My Local News” Is Recognised

This is currently another critical transition.

Do NOT immediately:

```text
state = success
↓
voice.close()
↓
setScreen(account)
```

That can terminate the speech that is supposed to tell the user the test worked.

Instead:

```text
Command recognised
      ↓
Stop ASR
      ↓
Resolver confirms test command
      ↓
success haptic
      ↓
Speak success message fully
      ↓
THEN transition to Step 3
```

Required message:

> Great. I heard “Play my local news.” Voice access is working.

Wait until that finishes.

Then:

```text
setScreen("account")
```

---

# 20. Do Not Let `voice.close()` Cancel Success Speech

This is especially important.

The onboarding should not observe:

```text
voice.state === success
```

and immediately call:

```ts
voice.close();
```

because `close()` ultimately stops speech.

Instead VoiceProvider needs a proper **session completion event**.

For example:

```ts
voiceEvents.emit({
  type: "sessionCompleted",
  sessionId,
  result,
});
```

The sequence inside VoiceProvider should be:

```text
set state success
↓
success haptic
↓
await success announcement
↓
emit sessionCompleted
```

Onboarding then responds to:

```text
sessionCompleted
```

not the intermediate:

```text
state === "success"
```

---

# 21. Step 3 Must Always Speak

After the successful test speech finishes:

```text
screen = account
```

Step 3 MUST independently announce itself.

Do not assume the success speech was enough.

Required Step 3 announcement:

> Optional account. Step 3 of 3. An account keeps your saved audio and listening progress with you. Say Apple, Google, or Not now.

This must happen every time Account becomes the active onboarding state.

---

# 22. Step 3 Voice Selection Starts After Speech

Correct sequence:

```text
Account screen becomes active
        ↓
Speak entire Step 3 instruction
        ↓
Wait for TTS completion
        ↓
Listening tone
        ↓
Start account-selection ASR
        ↓
Start 8-second countdown
```

Visual state:

```text
● HEAR IS LISTENING             8s ◯

Say:
“Apple”
“Google”
or
“Not now”
```

Then:

```text
8
7
6
5
4
3
2
1
```

---

# 23. Step 3 Timeout

If the user says nothing:

```text
8 seconds
↓
ASR closes
↓
countdown disappears/stops
↓
timeout haptic
```

Then speak:

> I didn't hear a choice. Listening is closed. Double-tap anywhere when you're ready. You can say Apple, Google, or Not now.

The user now knows:

1. Hear stopped listening.
2. Nothing went wrong with the entire app.
3. How to start listening again.
4. What choices are valid.

---

# 24. Step 3 Retry

After timeout:

```text
DOUBLE TAP ANYWHERE
```

must mean:

```text
restart account voice selection
```

not:

```text
send speech to normal global content resolver
```

Sequence:

```text
double tap
↓
listening tone
↓
8-second countdown
↓
listen for:
Apple / Google / Not now
```

---

# 25. Step 3 Success

User says:

```text
Apple
```

Hear should:

```text
stop ASR
↓
confirmation haptic
↓
speak:
"Apple selected. Opening Apple sign-in."
↓
launch Apple auth
```

For Google:

> Google selected. Opening Google sign-in.

For Not now:

> Not now selected. Setup complete. Opening Hear.

Then navigate automatically.

---

# 26. Permission Denied Screen

Permission denied stays:

```text
VOICE ACCESS · 2 OF 3

Microphone access is off.
```

As soon as permission denial is known:

```text
stop permission/voice activity
↓
warning haptic
↓
state becomes permissionDenied
↓
announce state
```

Required speech:

> Voice access. Step 2 of 3. Microphone access is off. Double-tap anywhere to open Settings.

The entire screen's action is:

```text
DOUBLE TAP
→ Open Settings
```

No button discovery is required.

---

# 27. Returning From Settings

Add an AppState listener specifically for the permission-denied onboarding state.

When:

```text
AppState
background → active
```

recheck permission.

If still denied:

> Microphone access is still off. Double-tap anywhere to open Settings.

If now granted:

```text
success haptic
↓
speak:
"Microphone access is now on. Let's try your first voice command. After the tone, say Play my local news."
↓
wait for speech
↓
tone
↓
ASR
↓
8-second timer
```

The user does not need to tap anything after returning with permission enabled.

---

# 28. Fix Speech Across the Main Application

This problem is not limited to onboarding.

Each normal screen needs to announce when it **gains navigation focus**.

Current screen registration must not rely only on React mount/unmount.

A tab screen can stay mounted while another tab becomes active.

Change screen registration from:

```ts
useEffect(...)
```

to focus-aware registration.

Conceptually:

```ts
useFocusEffect(
  useCallback(() => {
    return registerScreen(screenContext);
  }, [registerScreen, screenContext]),
);
```

Therefore:

```text
Home focused
→ Home context active
→ Home announcement

Discover focused
→ Discover context active
→ Discover announcement

Library focused
→ Library context active
→ Library announcement
```

---

# 29. Every Top-Level Screen Must Supply Spoken Orientation

`AppScreen` should require:

```ts
screenId
pathname
screenTitle
screenOrientation
```

Example Home:

```ts
{
  screenId: "home",
  pathname: "/home",
  screenTitle: "Home",
  screenOrientation:
    "Home. Your latest listening and recommendations are here. Voice control is available."
}
```

Discover:

```text
Discover. Browse publications, topics and organisations. Voice control is available.
```

Library:

```text
Library. Your saved and downloaded listening is here. Voice control is available.
```

Player:

```text
Now playing. Your current audio and playback controls are available.
```

No top-level app route should have an empty screen announcement.

---

# 30. Central Screen Announcement Lifecycle

When the focused route changes:

```text
focused screen changes
↓
cancel previous screen-orientation speech
↓
announce new screen
```

Do not trigger announcements on:

```text
re-render
layout
data refresh
scroll
```

unless the actual meaningful state has changed.

---

# 31. Global Voice Overlay Must Speak Its State

When normal app voice control opens:

Before listening:

> Voice control. You are on Home. Speak after the tone.

or:

> Voice control. You are on Discover. Speak after the tone.

Then:

```text
speech complete
↓
tone
↓
ASR
```

When resolving:

Do not continuously talk.

Use a processing sound/haptic where useful.

When success occurs:

Speak the action result.

When failure occurs:

Speak what failed and how to retry.

---

# 32. Reusable `ListeningCountdown`

Create one component used by:

```text
Onboarding Voice Test

Step 3 Account Voice Selection

GlobalVoiceDock
```

Recommended interface:

```ts
type ListeningCountdownProps = {
  startedAt: number;
  deadlineAt: number;
  speechDetected: boolean;
  onExpired?: () => void;
};
```

The component only displays state.

It must **not** own the actual timeout decision.

VoiceProvider owns the timeout.

---

# 33. Recommended Listening UI

Use this structure:

```text
● LISTENING                         ╭────╮
                                    │ 8s │
                                    ╰────╯

Speak naturally.

I'll show what I heard, then continue.

────────────────────────────────────

Say “cancel” to stop.
```

The circle decreases clockwise.

At 4 seconds:

```text
● LISTENING                         ╭────╮
                                    │ 4s │
                                    ╰────╯
```

At speech detection:

```text
● I CAN HEAR YOU

Listening…
```

The no-speech circle can stop/disappear once speech is detected.

---

# 34. Voice State Must Include Timer Information

Extend voice state:

```ts
type VoiceStateData = {
  state: VoiceState;

  sessionId?: string;

  message?: string;

  transcript?: string;

  listeningStartedAt?: number;

  listeningDeadlineAt?: number;

  speechDetected?: boolean;
};
```

This gives every voice UI one source of truth.

---

# 35. Audio Rules

Use three distinct audible cues.

```text
LISTENING START
→ short clean tone

4 SECOND NO-SPEECH REMINDER
→ subtle non-speech tick

SUCCESS
→ short positive tone
```

Errors:

```text
short low/error cue
+
haptic
```

Do not use spoken countdown numbers while the microphone is active.

---

# 36. Important State Transition Rule

Never do:

```text
set new screen
+
stop speech
+
start ASR
```

at the same time.

Every transition must be sequential.

Example:

```ts
await stopRecognition();

await announce(
  "Great. I heard Play my local news. Voice access is working.",
);

setScreen("account");
```

Then the Account state effect handles:

```ts
await announce(
  "Optional account. Step 3 of 3. Say Apple, Google, or Not now.",
);

await startAccountListening();
```

---

# 37. Required Onboarding Flow After Fix

```text
WELCOME
   │
   │ speech:
   │ "Welcome... double-tap anywhere"
   ▼
DOUBLE TAP
   │
   ▼
VOICE ACCESS
   │
   │ speech:
   │ "Step 2 of 3..."
   ▼
DOUBLE TAP
   │
   ▼
NATIVE PERMISSION
  /           \
 /             \
DENIED        GRANTED
 │              │
 ▼              ▼
Speak:       success tone
"Mic off"       │
 │              ▼
Double Tap   Speak:
 │          "Mic granted..."
 ▼              │
Settings         ▼
 │          TTS FINISHES
 │              │
 │              ▼
 │             TONE
 │              │
 │              ▼
 │         ● LISTENING  8s
 │              │
 │         Play my local news
 │              │
 │        ┌─────┴─────┐
 │        │           │
 │      NO SPEECH   SUCCESS
 │        │           │
 │        ▼           ▼
 │    stop mic     stop mic
 │        │           │
 │        ▼           ▼
 │     speak        speak:
 │   retry info    "Voice works"
 │                    │
 │                    ▼
 │             OPTIONAL ACCOUNT
 │                  3 OF 3
 │                    │
 │                  speak
 │       "Apple, Google, Not now"
 │                    │
 │                    ▼
 │                   TONE
 │                    │
 │                    ▼
 │              ● LISTENING 8s
 │                    │
 │          ┌─────────┼─────────┐
 │          │         │         │
 │       APPLE     GOOGLE    NOT NOW
 │          │         │         │
 │          └─────────┼─────────┘
 │                    │
 └────────────────────┤
                      ▼
                   COMPLETE
```

---

# 38. Files That Need Modification

The main implementation work should be concentrated in:

```text
src/screens/OnboardingScreen.tsx

src/hooks/useOnboardingSetup.ts

src/providers/AccessibilityProvider.tsx

src/providers/VoiceProvider.tsx

src/providers/voice-context.ts

src/components/ui/AppScreen.tsx

src/components/voice/ListeningPanel.tsx

src/components/voice/VoiceStatusBadge.tsx

src/components/voice/GlobalVoiceDock.tsx

src/constants/voice.ts

src/constants/onboarding-steps.ts
```

Add:

```text
src/components/voice/ListeningCountdown.tsx
```

Optionally add:

```text
src/services/voice/onboarding-announcer.ts
```

if separating onboarding narration from general screen speech makes the lifecycle easier to test.

---

# 39. Specific Current Behaviours To Remove

Remove dependence on:

```text
onLayout → announce onboarding
```

Remove:

```text
voice success
→ immediately voice.close()
→ immediately set account
```

Remove:

```text
voice test timeout
→ return to permission introduction
```

Remove:

```text
4-second reminder
→ visual text only
```

Remove duplicated independent progress timers where possible.

Remove normal-screen active-context tracking based only on mount/unmount.

---

# 40. Acceptance Test — Screen Speech

Navigate:

```text
Home
→ Discover
→ Library
→ Player
```

Expected:

Every focused screen produces exactly one appropriate orientation announcement.

No screen is silent.

No previous screen speaks after navigation.

---

# 41. Acceptance Test — Permission Granted

Expected sequence:

```text
Allow permission

Hear:
"Microphone access granted..."

speech finishes

tone

LISTENING appears with:
●
8-second circle

ASR starts
```

ASR must not start before the permission-success speech finishes.

---

# 42. Acceptance Test — No Speech

Do not say anything.

Expected:

```text
8 → 7 → 6 → 5

at 4:
subtle cue/haptic

4 → 3 → 2 → 1 → 0

ASR closes
```

Only after ASR closes:

> I didn't hear anything. Double-tap anywhere to try again.

Then double tap:

```text
tone
↓
8-second timer restarts
↓
ASR restarts
```

---

# 43. Acceptance Test — Successful Voice Test

Say:

> Play my local news.

Expected:

```text
speech detected
↓
timer stops
↓
resolver succeeds
↓
ASR closes
↓
success haptic
↓
Hear says:
"Great. I heard Play my local news. Voice access is working."
↓
speech completely finishes
↓
Step 3 appears
↓
Hear says:
"Optional account. Step 3 of 3..."
↓
speech finishes
↓
tone
↓
account listening starts
```

There must be **no silence between entering Step 3 and the user being told what Step 3 is**.

---

# 44. Acceptance Test — Step 3 Timeout

Do not answer Apple/Google/Not now.

Expected:

```text
● LISTENING + circular 8-second timer

timer reaches 0

microphone closes
```

Then:

> I didn't hear a choice. Listening is closed. Double-tap anywhere when you're ready. You can say Apple, Google, or Not now.

Double tap must restart **account choice listening**, not a generic resolver session.

---

# 45. Acceptance Test — TalkBack

With TalkBack enabled:

Welcome:

```text
double tap
→ Step 2
```

Permission denied:

```text
double tap
→ Settings
```

Return with permission enabled:

```text
permission automatically detected
→ Hear explains next step
→ ASR starts only after instructional speech
```

Step 3:

```text
Hear announces the step
→ account voice selection becomes available
```

Hear custom gestures must not fight TalkBack.

---

# 46. Final Rule

For every Hear state, ask:

```text
If the screen were completely black,
would the user still know:

1. where they are?
2. what just happened?
3. whether Hear is listening?
4. whether listening stopped?
5. what they should say?
6. what they should do next?
```

If the answer to any of those is no, that state is not complete.

The screen is visual confirmation.

**Speech, sound, haptics, the listening indicator, the 8-second countdown, and deterministic state transitions are the actual interface for a blind user.**