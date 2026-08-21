Hear! Listener — Complete Voice Access, Speech, Onboarding & ASR Fix Specification
1. Objective

Hear! Listener is a voice-invocation application designed primarily for blind and visually impaired users.

A user must be able to operate Hear without seeing the screen.

At every point the application must communicate:

where the user is;
what just happened;
whether Hear is speaking;
whether Hear is listening;
whether Hear heard the user;
whether listening has stopped;
what the user can do next;
how to invoke voice again.

There must never be a silent state transition where the UI changes but a blind user receives no explanation.

2. Non-Negotiable Behaviour

The following rules apply throughout the application.

Rule 1 — Every screen announces itself

When a screen becomes focused:

SCREEN FOCUSED
    ↓
Hear reads the screen orientation
    ↓
Hear tells the user the primary voice interaction

Example:

Home. Your latest listening and recommendations are here. Double-tap anywhere to speak.

Rule 2 — Hear never talks while ASR is listening

Once the microphone is open:

NO HEAR TTS
NO SCREEN ANNOUNCEMENTS
NO IDLE REMINDERS
NO AUDIO CLICK
NO 4-SECOND AUDIO PING
NO PLAYBACK AUDIO
NO NAVIGATION SOUND

Allowed while listening:

ASR
visual UI updates
haptic feedback

This is an absolute rule.

Rule 3 — The 8-second timer is only a pre-speech timer

Eight seconds means:

The microphone opened but the user never started speaking.

It must NOT mean:

Close the microphone eight seconds after it opens.

The instant the user begins speaking:

8-second timer = CANCELLED

permanently for that voice session.

Rule 4 — Never close while the user is actively speaking

After speech begins, Hear remains listening while transcript activity continues.

A natural pause must not immediately close recognition.

Rule 5 — Only one component owns microphone timing

VoiceProvider owns all ASR timers.

UI components display those timers.

UI components must never create their own independent timeout logic.

Rule 6 — Every failure gives a recovery instruction

Examples:

I didn't hear anything. Listening is closed. Double-tap anywhere when you're ready to try again.

Microphone access is off. Double-tap anywhere to open Settings.

I heard you, but I couldn't match that command. Double-tap anywhere to try again.

3. Exact User Reminder Policy

The initial screen narration is not considered a reminder.

When Hear reads a screen and the user performs no action:

SCREEN NARRATION
      ↓
wait 15 seconds
      ↓
REMINDER 1
      ↓
wait until 35 seconds from narration completion
      ↓
REMINDER 2
      ↓
STOP REMINDING

Therefore the maximum is:

2 inactivity reminders after the initial narration.

Not five.

Not endless reminders.

4. Example Reminder Behaviour

Welcome:

Initial:
"Welcome to Hear. Step 1 of 3.
Double-tap anywhere to continue."

15 seconds after narration finishes:
"Double-tap anywhere to continue."

35 seconds after narration finishes:
"When you're ready, double-tap anywhere to continue."

After that:
SILENCE

Any user action cancels both reminder timers.

A state transition starts a new reminder lifecycle for the new state.

5. Never Run Idle Reminders During Voice

Idle reminders only exist while Hear is waiting for a gesture/action.

They must be cancelled immediately when:

voice preparation begins
permission dialog opens
ASR begins
user begins speaking
resolver begins
authentication begins
screen changes
app backgrounds

They must never fire while the microphone is open.

6. Required High-Level Architecture
                   USER
                     │
             DOUBLE TAP / VOICE
                     │
                     ▼
            GLOBAL VOICE PROVIDER
                     │
        ┌────────────┼─────────────┐
        │            │             │
     SCREEN       SPEECH         ASR
     CONTEXT     COORDINATOR     SERVICE
        │            │             │
        │            ▼             │
        │      AUDIO QUIET GATE    │
        │            │             │
        └────────────┼─────────────┘
                     │
                     ▼
               VOICE SESSION
                     │
             TRANSCRIPT / RESULT
                     │
                     ▼
                  RESOLVER
                     │
                     ▼
                 EXECUTOR
                     │
                     ▼
              RESULT FEEDBACK

There is one global voice runtime.

Screens do not create their own recognizers.

7. Provider Layout

Current application provider structure should become:

GestureHandlerRootView
│
└── AccessibilityProvider
    │
    └── VoiceProvider
        │
        └── VoiceGestureLayer
            │
            ├── PlaybackRuntime
            ├── AudioRuntime
            ├── AppActivityRuntime
            ├── AccountRuntime
            ├── RootNavigator
            │
            └── GlobalVoiceDock

The important change is:

GlobalVoiceDock

must be inside:

VoiceGestureLayer

rather than beside it.

This ensures the voice overlay and the screen underneath participate in the same global interaction system.

8. File Path

Modify:

src/providers/VoiceProvider.tsx

Change:

<VoiceContext.Provider value={value}>
  <VoiceGestureLayer>
    {children}
    <GlobalVoiceDock />
  </VoiceGestureLayer>
</VoiceContext.Provider>

Do not render GlobalVoiceDock outside the gesture layer.

9. Screen Speech Architecture

There must be exactly one automatic screen-announcement authority.

Currently screen speech is triggered from multiple places.

Fix this.

Recommended authority:

src/components/ui/AppScreen.tsx

AppScreen already knows when the route actually gains focus.

Therefore:

AppScreen focus
      ↓
register active screen
      ↓
speak screen orientation ONCE
      ↓
schedule two idle reminders
10. Remove Duplicate Screen Announcement

Modify:

src/providers/VoiceProvider.tsx

Remove the effect that independently announces:

activeScreen.orientation

after activeScreen changes.

VoiceProvider should store the active screen context.

It should not simultaneously become a second automatic screen narrator.

11. Screen Focus Must Be the Source of Truth

Modify:

src/components/ui/AppScreen.tsx

Continue using navigation focus.

Required behaviour:

Home focused
→ register Home
→ speak Home

Discover focused
→ unregister Home as active
→ register Discover
→ speak Discover

A mounted but unfocused tab must never announce itself.

12. Legacy Screen Registration

Path:

src/providers/voice-context.ts

The existing:

useRegisterScreenVoice()

uses a normal useEffect.

Either:

remove/deprecate this hook and use AppScreen everywhere; or
change it to navigation-focus registration.

Do not maintain two different active-screen registration systems.

Recommended:

Use AppScreen as the standard screen contract.

13. Required Screen Contract

Every normal screen should eventually provide:

<AppScreen
  screenTitle="Home"
  screenOrientation="
    Home.
    Your latest listening and recommendations are here.
    Double-tap anywhere to speak.
  "
  screenReadout={...}
>

Required data:

screen id
pathname
title
orientation
readout
voice availability
14. Speech Coordinator Must Become the Only Speech Authority

Path:

src/services/voice/speech-coordinator.ts

All Hear-generated spoken audio must pass through this service.

Including:

screen orientation
onboarding narration
permission messages
voice-test instructions
ASR failures
resolver failures
command confirmations
account instructions
idle reminders
completion messages

No component should call expo-speech directly.

15. Do Not Speak Through Two Channels Simultaneously

Current behaviour can:

AccessibilityInfo.announceForAccessibility()
+
ukSpeech.speak()

for the same message.

That must stop.

For required Hear narration, choose one speaking channel.

Recommended behaviour:

Hear onboarding and voice guidance

Use:

Hear TTS / ukSpeech

as the primary spoken guide.

Do not simultaneously send identical speech to:

AccessibilityInfo.announceForAccessibility

TalkBack/VoiceOver still handles accessibility focus and native controls normally.

16. Native System Dialogs Are Different

When these are visible:

Android microphone permission
iOS microphone permission
Apple authentication
Google authentication
system Settings

Hear must stop its own speech.

The operating system and TalkBack/VoiceOver own those interfaces.

17. Add an Audio Quiet Gate

Add:

src/services/voice/audio-gate.ts

Purpose:

Prevent Hear from creating sound while ASR owns the microphone.

Recommended API:

type VoiceAudioGate = {
  enterQuietMode(): Promise<void>;
  exitQuietMode(): void;
  isQuiet(): boolean;
};

Entering quiet mode must:

cancel Hear TTS
cancel screen narration
cancel idle reminders
pause Hear playback
block normal one-shot sounds
18. Quiet Mode Timing

Correct voice start:

Hear finishes instruction
       ↓
stop/flush TTS
       ↓
pause programme playback
       ↓
cancel screen reminders
       ↓
play ONE listening-start tone
       ↓
wait for tone to finish
       ↓
ENTER STRICT QUIET MODE
       ↓
open microphone

Once the microphone opens:

NO APP AUDIO

until ASR closes.

19. One-Shot Audio Must Respect Quiet Mode

Modify:

src/lib/audio/one-shots.ts

Normal sounds should check:

if (voiceAudioGate.isQuiet()) {
  return;
}

Exception:

The listening-start tone is played before the microphone opens.

It therefore does not need to play while quiet mode is active.

20. Playback Must Be Silent While Listening

When voice is invoked while audio is playing:

pause/duck content
↓
prompt user if necessary
↓
listening tone
↓
microphone

Content must not continue playing into ASR.

After the voice session:

resume previous playback if the command did not intentionally alter playback;
do not resume if the command itself started different content, paused playback, changed track, etc.
21. Onboarding State Machine

Use the following explicit phases:

welcomeNarrating
welcomeWaiting

permissionNarrating
permissionWaiting
requestingPermission

permissionDeniedNarrating
permissionDeniedWaiting

voiceTestPrompting
voiceTestWaitingForSpeech
voiceTestUserSpeaking
voiceTestResolving
voiceTestError
voiceTestSuccess

accountNarrating
accountWaitingForSpeech
accountUserSpeaking
accountResolving
accountError

completing
complete

A state name must describe what Hear is actually doing.

Do not label something Listening before the microphone is open.

22. File Path

Primary onboarding state logic:

src/hooks/useOnboardingSetup.ts

This hook owns:

onboarding phase
permission state
screen narration sequencing
onboarding gesture meaning
transition to Settings
return from Settings
voice-test lifecycle
Step 3 account lifecycle
completion

It does NOT own low-level ASR timers.

Those remain in VoiceProvider.

23. Step 1 — Welcome

On screen entry:

phase = welcomeNarrating

Hear says:

Welcome to Hear. Step 1 of 3. Hear will guide you using speech and voice. Double-tap anywhere to continue.

When narration completes:

phase = welcomeWaiting

Now start inactivity reminder timers.

24. Welcome Interaction

Screen reader OFF:

Hear global double tap
→ continue

TalkBack/VoiceOver ON:

The screen-level accessibility action receives focus.

Physical double tap activates:

Continue

Both paths call the exact same function:

advanceWelcome()
25. Step 2 — Permission Introduction

Enter:

permissionNarrating

Speak:

Voice access. Step 2 of 3. Hear listens only when you ask. The microphone closes after each command. Double-tap anywhere to request microphone access.

After narration:

permissionWaiting

Double tap now means:

requestMicrophonePermission()
26. Before Opening Native Permission

This sequence is mandatory:

Double tap
↓
cancel inactivity reminders
↓
await speechCoordinator.cancel()
↓
verify Hear is no longer speaking
↓
phase = requestingPermission
↓
request native permission

Do NOT speak after calling the native permission API until the OS dialog has completed.

27. Native Permission Dialog

While it is visible:

Hear TTS = OFF
Hear idle reminders = OFF
Hear ASR = OFF
Hear one-shot sounds = OFF

TalkBack/VoiceOver and the operating system control the dialog.

28. Permission Denied

When permission returns denied:

phase = permissionDeniedNarrating

Hear says:

Voice access. Step 2 of 3. Microphone access is off. Double-tap anywhere to open Settings.

Then:

phase = permissionDeniedWaiting

Current double tap:

OPEN SETTINGS

No visual button is required.

29. Denied Screen Behaviour

Path:

src/components/onboarding/VoiceAccessStep.tsx

The denied screen can visually show:

Microphone access is off.

● HEAR IS SPEAKING

“Microphone access is off.
Double-tap anywhere to open Settings.”

ONE GESTURE

Double-tap anywhere.

But HEAR IS SPEAKING must only display while narration is actually occurring.

Do not leave it permanently visible after speech has stopped.

30. Full-Screen Pressable Fix

VoiceAccessStep currently wraps the screen in a Pressable.

Do not allow a normal single tap to trigger onboarding actions for users without a screen reader.

Use:

onPress={
  screenReaderEnabled
    ? handleAccessibilityActivation
    : undefined
}

Screen reader OFF:

global double-tap recognizer handles action

Screen reader ON:

native accessibility activation handles action

A single accidental touch must not:

request permission
open Settings
restart ASR
31. Returning From Settings

Path:

src/hooks/useOnboardingSetup.ts

Listen for:

AppState → active

only while in permission-denied/Settings-return state.

Then:

check microphone permission

If still denied:

Microphone access is still off. Double-tap anywhere to open Settings.

If granted:

success haptic
↓
voiceTestPrompting
32. Permission Granted

Speak:

Microphone access is now on. Let's try your first voice command. After the tone, say “Play my local news.”

Or on first grant:

Microphone access granted. Let's try one command. After the tone, say “Play my local news.”

Wait for the entire sentence to finish.

Only then start microphone preparation.

33. Critical State Ordering

Do NOT do:

setPhase("voiceTestListening");

await speakInstruction();

That states the app is listening while it is actually speaking.

Correct:

phase = voiceTestPrompting
↓
speak instruction
↓
speech completes
↓
play listening tone
↓
tone completes
↓
open microphone
↓
phase = voiceTestWaitingForSpeech
34. Global ASR Timing Model

The ASR lifecycle must be divided into three different periods.

A. WAITING FOR SPEECH

B. USER SPEAKING

C. WAITING TO CONFIRM USER FINISHED

These periods must use different timing rules.

35. Period A — Waiting for Speech

The microphone opens.

Start:

PRE_SPEECH_TIMEOUT = 8 seconds

Visual:

● LISTENING                   ◯ 8

Countdown:

8
7
6
5
4
3
2
1
0

This timer exists only until the first speech activity.

36. Four-Second Reminder

At 4 seconds with no speech:

Current behaviour that plays an audio click must be removed.

DO NOT:

playClick()
TTS "Still listening"

Instead:

one light haptic only

Visual text may change to:

Still listening…

but Hear remains completely silent.

37. Eight-Second No-Speech Timeout

If no speech occurs for 8 seconds:

close recognition
↓
wait until microphone has actually closed
↓
exit audio quiet mode
↓
error haptic
↓
speak recovery instruction

For normal app:

I didn't hear anything. Listening is closed. Double-tap anywhere when you're ready to listen again.

For onboarding:

I didn't hear anything. Double-tap anywhere when you're ready to try again. After the tone, say “Play my local news.”

38. The Moment Speech Begins

Consider speech started when ANY of these occurs:

speechstart event

first non-empty interim result

first non-empty final segment

Do not rely only on speechstart.

Some recognizer implementations may produce transcript data even when timing events differ.

39. When Speech Begins

Immediately:

speechDetected = true

cancel preSpeechTimer
cancel fourSecondReminder
hide countdown circle

Visual changes:

● I CAN HEAR YOU

The 8-second countdown must disappear.

It must never reach zero while the user is talking.

40. Period B — User Is Speaking

Once speech begins:

NO 8-SECOND TIMER

Maintain:

lastSpeechActivityAt

Update it whenever:

speechstart
interim transcript changes
final segment arrives
additional words arrive

Every new piece of speech means:

the user is still active
41. Recognition Must Be Continuous

Path:

src/utils/voice/platform.ts

Change:

continuous: false

to:

continuous: true

because Hear commands may contain:

natural pauses;
places;
names;
long descriptions;
feedback;
corrections.
42. Android Silence Tolerance

Current short silence configuration must be increased.

Path:

src/constants/voice.ts

Recommended:

androidMinSpeechInputMs: 1000,

androidPossibleSilenceMs: 2500,

androidCompleteSilenceMs: 3500,

Path:

src/utils/voice/platform.ts

Pass:

EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS:
  VOICE_TIMING.androidMinSpeechInputMs,

EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS:
  VOICE_TIMING.androidPossibleSilenceMs,

EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS:
  VOICE_TIMING.androidCompleteSilenceMs,

Do not use approximately 1.4 seconds as the effective command-ending rule.

43. iOS Recognition Hint

Normal Hear commands are not yes/no confirmation phrases.

For general voice commands use:

iosTaskHint: "dictation"

or unspecified if testing shows better results.

Do not globally use:

confirmation

for normal content commands.

Step 3's small Apple / Google / Not now vocabulary can use specialised matching in onboarding logic.

44. Do Not Resolve the First Final Segment Immediately

This is critical.

With continuous recognition, a recognizer may produce:

Final segment:
"Play me some news"

pause

Final segment:
"from Herne Bay"

pause

Final segment:
"about the council"

The first isFinal must NOT immediately go to the resolver.

45. Transcript Accumulation

Modify:

src/providers/VoiceProvider.tsx

Session should maintain:

finalSegments: string[];
currentPartial: string;
lastSpeechActivityAt: number;
speechDetected: boolean;

Example:

finalSegments[0]
"play me some news"

finalSegments[1]
"from Herne Bay"

finalSegments[2]
"about the council"

Build final command:

play me some news from Herne Bay about the council

46. Deduplicate Segments

Speech engines sometimes repeat previous text.

Before appending a final segment:

normalize whitespace
compare against last final segment
avoid exact duplicates
avoid appending a transcript already contained at the end

Do not produce:

play news play news from Herne Bay

because of repeated recognizer callbacks.

47. Period C — Detecting End of Command

After speech has started, Hear should finish only after true inactivity.

Recommended:

POST_SPEECH_SILENCE = 3.5 seconds

Any new interim/final transcript:

reset 3.5-second timer

If no new speech activity for 3.5 seconds:

finish recognition
↓
resolve accumulated command
48. Native speechend Does Not Automatically Mean Finished

Treat:

speechend

as:

The native recognizer thinks speech may have paused.

Do not immediately resolve solely because of this event.

Use lastSpeechActivityAt and the post-speech silence timer.

49. Character Safety Limit

User speech must be allowed to be long enough that natural commands are not cut off.

Recommended:

maxTranscriptCharacters: 800

Approximately 800 characters is far beyond a normal Hear voice command.

When the accumulated transcript reaches the limit:

stop recognition
↓
resolve the text collected so far

Do not discard it.

50. Do Not Use a Short Absolute Timeout Once the User Is Speaking

Current generic:

maxRecognitionDuration = 30 seconds

must not terminate an actively changing transcript.

Replace it with an inactivity watchdog.

Recommended:

recognitionActivityWatchdog: 60_000

But reset the watchdog whenever speech/transcript activity occurs.

Therefore it means:

Something is broken and we have received no recognition activity for an abnormally long time.

It does NOT mean:

Stop somebody who has been speaking for 30 seconds.

51. Final End Conditions

Recognition ends only when one of these happens:

1. No speech for first 8 seconds

2. Speech started, then 3.5 seconds of genuine inactivity

3. Transcript reaches 800 characters

4. User explicitly says/calls cancel

5. User explicitly stops voice

6. OS recognizer returns an unrecoverable error

7. App backgrounds / phone call interrupts session

Not merely because:

8 seconds elapsed while speaking

30 seconds elapsed while transcript is still changing

speechend fired once
52. VoiceProvider Timers

Path:

src/providers/VoiceProvider.tsx

Replace generic timer refs with explicit refs:

preSpeechTimer
noSpeechHapticTimer
postSpeechSilenceTimer
activityWatchdogTimer
resolverTimer

Each timer has one job.

Never reuse one timer for unrelated lifecycle stages.

53. Recommended Timing Constants

Path:

src/constants/voice.ts

Use:

export const VOICE_TIMING = {
  preSpeechTimeout: 8000,

  noSpeechHapticReminder: 4000,

  postSpeechSilence: 3500,

  maxTranscriptCharacters: 800,

  recognitionActivityWatchdog: 60000,

  resolutionTimeout: 5000,

  contextualTermsLimit: 80,

  androidMinSpeechInputMs: 1000,

  androidPossibleSilenceMs: 2500,

  androidCompleteSilenceMs: 3500,

  firstIdleReminder: 15000,

  secondIdleReminder: 35000,
} as const;
54. Voice State Data

Extend the voice state/type.

Relevant path:

src/types/voice.ts

or the project's equivalent shared type file.

Add:

listeningStartedAt?: number;
listeningDeadlineAt?: number;

speechDetected?: boolean;

lastSpeechActivityAt?: number;

transcriptLength?: number;

listeningMode?:
  | "waitingForSpeech"
  | "speechDetected"
  | "finishing";
55. Circular 8-Second Indicator

Add:

src/components/voice/ListeningCountdown.tsx

Purpose:

Display the actual provider deadline.

Props:

type ListeningCountdownProps = {
  deadlineAt: number;
  speechDetected: boolean;
};

UI:

╭─────╮
│ 8 s │
╰─────╯

Circular stroke reduces until zero.

56. Countdown Must Use Provider Deadline

Do not create:

another local 8-second animation

as the source of truth.

Calculate:

remainingMs = Math.max(0, deadlineAt - Date.now());

remainingSeconds = Math.ceil(remainingMs / 1000);

This keeps the displayed timer synchronized with actual microphone behaviour.

57. Countdown Accessibility

Expose:

role = progressbar

min = 0
max = 8
now = remaining seconds

But do not automatically speak:

8
7
6
5
4
...

while ASR is listening.

That would contaminate recognition.

58. Listening Dot

Path:

src/components/voice/VoiceStatusBadge.tsx

When microphone is genuinely listening:

● LISTENING

Dot:

10–12 px
pulsing opacity

When speech is detected:

● I CAN HEAR YOU

The dot remains active.

Countdown disappears.

59. Listening Panel

Path:

src/components/voice/ListeningPanel.tsx

Remove the independent local 8-second progress animation as the authority.

Pass:

deadlineAt
speechDetected
voice state
transcript

from the provider.

Display:

Waiting for speech
● LISTENING                 ◯ 8s

Speak naturally.

Say “cancel” to stop.
User speaking
● I CAN HEAR YOU

Keep speaking.
Resolving
I HEARD

“Play my local news”

Working on that…
Error
TRY AGAIN

I didn't hear anything.

Double-tap anywhere to listen again.
60. Do Not Display False Listening States

A screen must only say:

HEAR IS LISTENING

when:

voice.state === "listening"

and the recognizer has actually started.

Do not hard-code the listening badge.

61. Step 3 Current UI Fix

Path:

src/components/onboarding/AccountStep.tsx

The current account screen must no longer permanently display:

HEAR IS LISTENING

Instead receive:

voiceState
voiceMessage
deadlineAt
speechDetected

from onboarding setup.

62. Step 3 Entry

After voice-test success:

stop ASR
↓
exit quiet mode
↓
success haptic
↓
speak:
"Great. I heard Play my local news.
Voice access is working."
↓
WAIT UNTIL SPEECH FINISHES
↓
phase = accountNarrating

Do not jump directly to account listening.

63. Step 3 Narration

Speak:

Optional account. Step 3 of 3. An account keeps your saved audio and listening progress with you. After the tone, say Apple, Google, or Not now.

Wait for speech to completely finish.

Then:

listening tone
↓
quiet mode
↓
ASR
↓
8-second PRE-SPEECH countdown
64. Step 3 Listening

Visual:

● LISTENING                 ◯ 8s

Say:
“Apple”
“Google”
or
“Not now”

The same ASR rules apply.

If speech begins:

remove 8-second countdown

Do not close while the user is speaking.

65. Step 3 Timeout

No response for 8 seconds:

close mic
↓
exit quiet mode
↓
speak

Required message:

I didn't hear a choice. Listening is closed. Double-tap anywhere when you're ready. You can say Apple, Google, or Not now.

Then:

phase = accountWaiting

Double tap now means:

START ACCOUNT LISTENING AGAIN
66. Step 3 Apple

User says:

Apple.

Sequence:

stop microphone
↓
exit quiet mode
↓
success haptic
↓
speak:
"Apple selected. Opening Apple sign-in."
↓
speech completes
↓
open native Apple authentication
67. Step 3 Google

Same:

Google selected. Opening Google sign-in.

Then native Google auth.

68. Step 3 Not Now

Sequence:

stop microphone
↓
speak:
"Not now selected. Setup complete. Opening Hear."
↓
speech finishes
↓
complete onboarding
↓
navigate Home
69. Do Not Start Step 3 Listening Twice

Path:

src/hooks/useOnboardingSetup.ts

There should be one state-entry handler for:

accountNarrating

It:

speaks;
waits;
starts account listening.

Do not both:

setPhase("account")

and independently call:

startAccountVoiceSelection()

from multiple effects/callbacks.

One phase owns one transition.

70. Completion Navigation

Current completion should be reconstructed as an async sequence.

Correct:

stop ASR
↓
cancel timers
↓
exit quiet mode
↓
speak final completion
↓
wait for speech
↓
persist setupComplete
↓
clear onboarding state
↓
router.replace(Home)
↓
Home gains focus
↓
Home announces itself

Do not navigate Home while onboarding completion TTS and Home TTS compete.

71. Onboarding Screen Rendering

Path:

src/screens/OnboardingScreen.tsx

Render based directly on phase groups.

Example:

welcome*
→ WelcomeStep

permission*
→ VoiceAccessStep

voiceTest*
→ VoiceAccessStep / VoiceTest UI

account*
→ AccountStep

The displayed visual state must always correspond to the actual state machine.

72. Voice Access Step

Path:

src/components/onboarding/VoiceAccessStep.tsx

Required states:

permission narration

permission waiting

permission denied

voice-test prompting

voice-test waiting

voice-test speaking

voice-test error

voice-test success

Do not treat all voice-test phases as the same handleAction.

During active listening:

full-screen retry action = DISABLED

because the user is already being heard.

73. Global Voice Gesture

Path:

src/components/voice/VoiceGestureLayer.tsx

Screen reader OFF:

IDLE
double tap
→ start voice

LISTENING
double tap
→ explicit stop/finish

ERROR
double tap
→ retry

ONBOARDING
double tap
→ onboarding state's current action

The gesture layer detects the gesture.

The active context determines its meaning.

74. TalkBack / VoiceOver

Do not enable Hear's custom double-tap recognizer while TalkBack/VoiceOver is controlling gestures.

Instead:

screen entry
↓
focus Hear's primary accessibility action
↓
physical double tap
↓
TalkBack activates that action

This is particularly important for onboarding.

75. System Screen Reader and Screen Narration

Even when TalkBack is active:

Hear can provide its own required spoken guide;
do not simultaneously announce the identical sentence through TalkBack's accessibility-announcement API;
native buttons/controls remain labelled correctly so TalkBack can read them when focused.

This avoids two voices speaking the same sentence on top of each other.

76. Normal App Voice Access

After onboarding, on any voice-enabled screen:

SCREEN FOCUSED
↓
Hear reads orientation
↓
user double taps / invokes accessible voice action
↓
cancel screen TTS
↓
pause playback
↓
speak voice prompt if required
↓
wait
↓
listening tone
↓
quiet mode
↓
ASR
77. Global Voice Dock

Path:

src/components/voice/GlobalVoiceDock.tsx

Remove behaviour where a single backdrop press can unexpectedly cancel a voice session.

During:

preparing
listening
speech detected
resolving

the entire backdrop must not function as a casual single-tap cancel target.

Voice should not disappear because the user accidentally touched the overlay.

78. Global Voice Dock Listening UI

Replace independent progress animation with:

VoiceStatusBadge
+
ListeningCountdown

using:

voice.listeningDeadlineAt
voice.speechDetected
79. Global Voice Dock Error

Visible Try Again/Dismiss controls may remain for sighted/touch users.

But they are not the only recovery path.

The spoken instruction must tell the blind user:

Double-tap anywhere to listen again.

Global gesture/accessibility action must execute the same retry.

80. Permission Error Outside Onboarding

For normal app voice invocation:

permission missing
↓
do NOT open microphone
↓
speak:
"Microphone access is off.
Double-tap anywhere to open Settings."

The voice overlay can visually display Settings controls, but visual button discovery must not be required.

81. Native Permission Must Never Hear Hear's Own Speech

This exact ordering applies globally:

Hear explains what is about to happen
↓
Hear finishes
↓
cancel TTS
↓
request permission
↓
OS dialog

Never:

open OS permission dialog
+
continue Hear TTS
82. External Notifications and Phone Audio

Hear can guarantee silence from Hear itself.

Hear cannot universally disable every notification sound generated by Android/iOS or other applications without special OS privileges.

Therefore the application must:

use correct audio focus/session
pause its own audio
detect interruptions
ignore/recover from microphone interruption
83. Phone Call / Major Interruption

If a call or major audio interruption occurs:

stop ASR safely
↓
preserve transcript if useful
↓
do not resolve notification/call audio as user speech
↓
when Hear regains focus
↓
tell user what happened

Example:

Voice listening was interrupted. Double-tap anywhere when you're ready to try again.

84. Minor External Notification

Do not intentionally terminate the session merely because a notification sound happened.

Recognition remains subject to:

speech activity
post-speech silence
character limit
actual ASR errors

Not arbitrary application UI events.

85. Speech Coordinator Quiet Lock

Path:

src/services/voice/speech-coordinator.ts

Add:

private quietMode = false;

Methods:

enterQuietMode()
exitQuietMode()
isQuiet()

When quiet:

speak()
announce()
speakBeforeListening()

must reject ordinary new speech.

Important exception:

speakBeforeListening() happens BEFORE quiet mode starts.

86. Force Does Not Override Microphone Safety

force: true may mean:

ignore normal speech preference
ignore duplicate suppression

It must NOT mean:

speak while ASR microphone is open

Microphone quiet mode always wins.

87. ASR Result Handling

Path:

src/providers/VoiceProvider.tsx

Current logic that resolves immediately on:

event.isFinal

must be replaced.

New behaviour:

result event
↓
update lastSpeechActivityAt
↓
mark speech detected
↓
store partial/final segment
↓
reset post-speech timer
↓
DO NOT RESOLVE YET

Resolution occurs when the finalisation rules say the utterance is complete.

88. Resolver Handoff

Only after ASR closes:

combine final segments
↓
trim
↓
validate length
↓
build hypotheses
↓
set state = resolving
↓
external resolver

Never leave the microphone listening while speaking resolver feedback.

89. Resolver Result

After resolution:

success
↓
speak result

clarification
↓
speak clarification question
↓
wait for speech completion
↓
start a NEW listening window

A clarification response gets its own 8-second pre-speech window.

Again, once the user starts answering, that 8-second timer is cancelled.

90. Recommended Source Changes
MODIFY

src/navigation/AppRoot.tsx

Ensure provider/runtime order supports one global voice layer.

src/providers/VoiceProvider.tsx

Major ASR state-machine reconstruction.

src/providers/AccessibilityProvider.tsx

Remove duplicate speech-channel behaviour and delegate narration to SpeechCoordinator.

src/providers/voice-context.ts

Remove/deprecate mount-based active-screen registration.

src/components/ui/AppScreen.tsx

Single focus-based screen narrator and two-reminder policy.

src/hooks/useOnboardingSetup.ts

Explicit onboarding state machine and strict sequential speech/ASR transitions.

src/screens/OnboardingScreen.tsx

Render directly from onboarding phases.

src/components/onboarding/VoiceAccessStep.tsx

Accurate state display; no accidental single-tap actions; full-screen accessibility activation only where appropriate.

src/components/onboarding/AccountStep.tsx

Real voice-state props; real listening indicator; 8-second countdown; no permanently hard-coded listening state.

src/components/voice/VoiceGestureLayer.tsx

Global gesture action routing and overlay inclusion.

src/components/voice/GlobalVoiceDock.tsx

Remove dangerous single-tap backdrop cancellation and use true listening deadline.

src/components/voice/ListeningPanel.tsx

Provider-controlled countdown and speech-detected state.

src/components/voice/VoiceStatusBadge.tsx

Pulsing listening/speaking state.

src/constants/voice.ts

New timing constants.

src/constants/onboarding-steps.ts

All state narration strings.

src/constants/screen-hints.ts

Two-reminder timing and content.

src/utils/voice/platform.ts

Continuous recognition and platform silence settings.

src/services/voice/speech.ts

Keep reliable completion callbacks; all callers must await them before ASR.

src/services/voice/speech-coordinator.ts

Single speech pipeline + microphone quiet lock.

src/services/voice/announce.ts

Route all voice announcements through the coordinator.

src/stores/onboarding-voice-store.ts

Only onboarding interaction state/events; no duplicate ASR lifecycle.

ADD

src/services/voice/audio-gate.ts

Central protection against app-generated sound while microphone is listening.

src/components/voice/ListeningCountdown.tsx

Circular provider-synchronised 8-second countdown.

91. Onboarding Speech Copy
Welcome

Welcome to Hear. Step 1 of 3. Hear will guide you using speech and voice. Double-tap anywhere to continue.

Permission

Voice access. Step 2 of 3. Hear listens only when you ask. The microphone closes after each command. Double-tap anywhere to request microphone access.

Permission granted

Microphone access granted. Let's try one command. After the tone, say “Play my local news.”

Permission denied

Voice access. Step 2 of 3. Microphone access is off. Double-tap anywhere to open Settings.

Permission enabled after Settings

Microphone access is now on. Let's try your first voice command. After the tone, say “Play my local news.”

No speech

I didn't hear anything. Listening is closed. Double-tap anywhere when you're ready to try again.

Test not understood

I heard you, but I couldn't match that command. Double-tap anywhere to try again. After the tone, say “Play my local news.”

Test success

Great. I heard “Play my local news.” Voice access is working.

Account

Optional account. Step 3 of 3. An account keeps your saved audio and listening progress with you. After the tone, say Apple, Google, or Not now.

Account timeout

I didn't hear a choice. Listening is closed. Double-tap anywhere when you're ready. You can say Apple, Google, or Not now.

Complete

Setup complete. Hear is ready.

92. Complete Voice-Test Timeline
PERMISSION GRANTED
       │
       ▼
Speak instruction
       │
       ▼
WAIT UNTIL TTS COMPLETES
       │
       ▼
Listening tone
       │
       ▼
WAIT UNTIL TONE COMPLETES
       │
       ▼
STRICT AUDIO QUIET MODE
       │
       ▼
MICROPHONE OPENS
       │
       ▼
● LISTENING + 8s CIRCLE
       │
       ├─────────── 4s, no speech
       │              ↓
       │         HAPTIC ONLY
       │
       ├─────────── 8s, still no speech
       │              ↓
       │         CLOSE MICROPHONE
       │              ↓
       │         EXIT QUIET MODE
       │              ↓
       │         SPEAK RETRY
       │
       └─────────── USER SPEAKS
                      ↓
                CANCEL 8s TIMER
                      ↓
                 ● I CAN HEAR YOU
                      ↓
             KEEP MICROPHONE OPEN
                      ↓
          transcript activity continues
                      ↓
               user becomes quiet
                      ↓
                 wait 3.5 seconds
                      ↓
              no new speech activity
                      ↓
                 CLOSE MICROPHONE
                      ↓
                 RESOLVE COMMAND
93. Acceptance Test — No Speech
Allow microphone.
Do not speak.
Listening indicator appears.
Circle shows 8 seconds.
At 4 seconds there is haptic only.
No Hear audio is emitted.
At 0, microphone closes.
Only after microphone closes does Hear say:

I didn't hear anything. Listening is closed. Double-tap anywhere when you're ready to try again.

Double tap restarts listening.

PASS only if all nine happen.

94. Acceptance Test — Long Speech

Say:

Play me some local news from Herne Bay about the council meeting yesterday and anything involving transport, but prioritise the newest report.

Pause naturally for 1–2 seconds between phrases.

Expected:

microphone remains open
8-second timer is already cancelled
partial results continue accumulating
no early resolver request
complete command reaches resolver

FAIL if Hear resolves after only:

Play me some local news

95. Acceptance Test — Very Long Speech

Continue speaking normally.

Expected:

Hear stays listening while transcript changes

Stop only after:

3.5 seconds genuine silence

OR

800 character safety limit

The old 30-second arbitrary close must not interrupt active speech.

96. Acceptance Test — Hear Does Not Hear Itself

Start voice.

Expected:

Hear speaks prompt
↓
prompt completes
↓
tone
↓
microphone starts

ASR transcript must not contain:

Speak naturally.

Voice control.

Play my local news.

unless the user actually said those words.

97. Acceptance Test — Step 3

Successful voice test.

Expected:

microphone closes;
Hear says the voice test succeeded;
speech finishes;
Step 3 appears;
Hear reads Step 3;
speech finishes;
listening tone;
microphone opens;
8-second circle appears;
user can say Apple, Google, or Not now.

There must not be silence when Step 3 appears.

98. Acceptance Test — Screen Narration

Navigate:

Home
Discover
Library
Player
Settings

Each focused screen must:

announce exactly once

There must not be overlapping duplicate Hear/TalkBack announcements generated by the application itself.

99. Acceptance Test — Idle Reminders

Open Welcome and do nothing.

Expected:

initial narration

15s after it finishes:
reminder 1

35s after it finishes:
reminder 2

then silence

No further reminders.

100. Acceptance Test — Audio Silence

While microphone is open:

Try to trigger:

screen hint
idle hint
4-second reminder
navigation sound
app playback
queued TTS

Expected:

None of them produce app audio.

Only haptic/visual changes are permitted.

101. Final Product Rule

Before considering any Hear voice state complete, perform this test:

If the phone screen were completely black, would the user know what is happening?

They must know:

where they are

whether Hear is speaking

whether Hear is listening

whether Hear heard them

whether listening ended

what failed

what succeeded

how to continue

how to invoke voice again

If any answer is no, the implementation is incomplete.

The final Hear interaction must feel like:

Hear explains
      ↓
Hear becomes silent
      ↓
user speaks
      ↓
Hear waits until the user is actually finished
      ↓
Hear understands/processes
      ↓
Hear explains the result

Hear must never compete with the person for the microphone, and it must never abandon a blind user in a silent UI state.