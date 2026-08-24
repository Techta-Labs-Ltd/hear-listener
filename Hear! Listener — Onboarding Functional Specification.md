Hear! Listener — Voice-First Onboarding Specification
1. Purpose

Hear! Listener onboarding is designed for blind and visually impaired users.

The onboarding must be usable without requiring the user to:

visually locate a button;
move accessibility focus through multiple controls;
read text on the screen;
find a specific area to tap;
understand conventional visual navigation.

The visual screens are a representation of the current state.

The actual onboarding interaction is driven by:

spoken guidance;
double-tap anywhere;
voice input;
audio cues;
haptic feedback;
automatic state transitions.

The fundamental rule is:

Every onboarding state tells the user what has happened and exactly what to do next.

2. Onboarding Structure

The onboarding has three logical steps:

1 OF 3 — Welcome

2 OF 3 — Voice Access

3 OF 3 — Optional Account

Step 2 contains several states:

VOICE ACCESS · 2 OF 3

Permission introduction
Permission request
Permission granted
Voice test
No speech
Recognition failure
Permission denied
Return from Settings

These are not additional onboarding steps.

3. No Button-Based Navigation

Onboarding navigation must not depend on visible buttons.

For the blind user:

Hear speaks
    ↓
User performs instructed gesture
or speaks instructed command
    ↓
Hear performs the action
    ↓
Hear announces the new state

A visual button may exist as part of the design or for authentication components where required by Apple/Google, but onboarding progression must not require the user to find it.

For the core onboarding flow:

NO:
"Find the Continue button."

NO:
"Tap Open Settings."

NO:
"Navigate to the microphone button."

YES:
"Double-tap anywhere to continue."

YES:
"Double-tap anywhere to open Settings."

YES:
"Say Apple, Google, or Not now."
4. Global Onboarding Interaction

During onboarding, the current onboarding state controls what a double tap means.

Example:

WELCOME

Double tap
→ Continue
VOICE PERMISSION INTRO

Double tap
→ Request microphone permission
MICROPHONE DENIED

Double tap
→ Open Settings
VOICE TEST RETRY

Double tap
→ Start listening again

The user does not need to know where on the screen to tap.

5. TalkBack / VoiceOver

TalkBack and VoiceOver must not cause onboarding to stop working.

Hear must not fight the operating system's accessibility gesture handling.

When TalkBack/VoiceOver is active, the current onboarding screen should expose one full-screen accessibility action when that state has one primary action.

Conceptually:

ENTIRE SCREEN
=
CURRENT ONBOARDING ACTION

Therefore:

TalkBack focuses onboarding screen
        ↓
User physically double taps anywhere
        ↓
TalkBack activates focused full-screen action
        ↓
Hear performs current onboarding action

There is still no visible button the user needs to find.

For example:

Welcome screen
→ full-screen action = Continue
Permission screen
→ full-screen action = Request permission
Permission denied screen
→ full-screen action = Open Settings

When TalkBack/VoiceOver is not active, Hear's own gesture layer detects the double tap.

Both paths must result in the same onboarding action.

6. Every Screen Must Speak

Every onboarding state must automatically announce itself when it becomes active.

The announcement must contain:

the current step;
what just happened;
what the user can do next.

Example:

Voice access. Step 2 of 3. Microphone access is off. Double-tap anywhere to open Settings.

The user must never arrive on a screen and hear nothing.

7. Announcement Trigger

Announcements must be based on onboarding state changes.

Use:

STATE ENTERED
    ↓
PLAY STATE ANNOUNCEMENT ONCE

Do not use UI layout events as the main announcement trigger.

React re-rendering must not cause the same instructions to play repeatedly.

8. Sounds and Haptics

Hear should use consistent non-verbal feedback throughout onboarding.

Recommended cues:

Gesture accepted
→ short haptic

Moving to next onboarding state
→ subtle transition sound

Microphone permission granted
→ success sound + success haptic

Listening starting
→ listening tone + listening haptic

Voice command recognised
→ success sound

No speech
→ gentle reminder sound

Voice recognition failure
→ error sound/haptic

Permission denied
→ warning/error cue before explanation

Speech communicates meaning.

Sound and haptics confirm state.

9. Step 1 — Welcome

Visual state:

WELCOME · 1 OF 3

Heading:

Hear what matters.
Skip the screens.

Example:

“Play my local news.”

Primary instruction:

Double-tap anywhere

10. Welcome Announcement

When Step 1 appears:

Welcome to Hear. Step 1 of 3. Hear helps you use the app through spoken guidance and voice. Double-tap anywhere to continue.

The screen must automatically receive the appropriate accessibility focus when TalkBack/VoiceOver is active.

11. Welcome Interaction

User:

DOUBLE TAP ANYWHERE

Hear:

Detect activation
    ↓
Short haptic
    ↓
Stop remaining Welcome speech
    ↓
Transition to Voice Access

No normal ASR session starts here.

Onboarding currently owns the double tap.

12. Step 2 — Voice Access Introduction

Visual state:

VOICE ACCESS · 2 OF 3

Purpose:

Explain how microphone access works before requesting it.

The screen should communicate:

Hear only listens when invoked;
the microphone is not continuously listening;
the microphone stops after a command;
the phone will request microphone permission next.
13. Voice Access Announcement

Recommended:

Voice access. Step 2 of 3. Hear listens only when you ask. The microphone stops after each command. Double-tap anywhere to continue and your phone will ask for microphone permission.

The user does not find a permission button.

14. Requesting Permission

User:

DOUBLE TAP ANYWHERE

Flow:

Gesture recognised
    ↓
Haptic
    ↓
Stop Hear speech
    ↓
Request native microphone permission

The native Android/iOS permission dialog then appears.

15. Native Permission Dialog

The operating system controls the permission dialog.

Hear does not replace it.

Possible results:

GRANTED

DENIED

BLOCKED / SETTINGS REQUIRED

TalkBack or VoiceOver handles accessibility inside the native permission dialog.

Once the native dialog closes, Hear immediately evaluates the result.

16. Permission Granted

If microphone access is granted:

permission = granted

Hear should immediately produce:

success sound
+
success haptic

Then announce:

Microphone access granted. Voice access is ready. Let's try one command.

The screen changes to the Voice Test state.

The progress remains:

VOICE ACCESS · 2 OF 3
17. Voice Test Screen

Visual design:

Let's try one command

SAY THIS

“Play my local news.”

The lower voice panel becomes the active voice interface.

It can display:

LISTENING

Speak naturally.

The user should not need to find or press anything visually.

18. Starting the First Voice Test

Once permission has just been granted, Hear can automatically prepare the first voice test.

Recommended flow:

Permission granted
      ↓
Success announcement
      ↓
Speak:
"After the tone, say Play my local news."
      ↓
Wait until Hear finishes speaking
      ↓
Listening tone
      ↓
Listening haptic
      ↓
Start ASR

The user does not need to press another button after granting permission.

The permission success naturally leads into the first voice test.

19. Critical TTS / ASR Rule

Hear must never listen while it is speaking the test instruction.

Correct:

Hear speaks
    ↓
Hear speech finishes
    ↓
short transition
    ↓
listening tone
    ↓
ASR starts

Incorrect:

ASR starts
    ↓
Hear speaks

Otherwise Hear may recognise its own voice.

20. Listening Announcement

Do not speak a long message after the microphone opens.

The listening tone should be enough.

The visual screen can show:

LISTENING

Speak naturally.

ASR listens for the user's test command.

21. Expected Test Command

Recommended onboarding command:

Play my local news.

The command goes through Hear's normal voice pipeline.

The onboarding only needs the result necessary to know whether voice access is working.

22. Voice Test Success

If successful:

ASR recognises command
       ↓
Voice pipeline accepts command
       ↓
Success sound
       ↓
Success haptic
       ↓
End onboarding voice test

Announce:

Voice access is working. Step 2 complete. Moving to the final setup step.

Then automatically navigate to:

OPTIONAL ACCOUNT · 3 OF 3

No button is required.

23. No Speech Detected

The design specifies a short listening window.

Example behaviour:

0 seconds
→ listening begins

4 seconds
→ gentle reminder if nothing heard

8 seconds
→ stop listening

At approximately 4 seconds without speech:

Play a gentle reminder cue.

Optionally speak a very short reminder only if it will not interfere with recognition.

At the final timeout:

stop ASR
↓
return to Voice Test Ready

Then announce:

I didn't hear anything. Double-tap anywhere when you're ready to try again.

24. Retry After Timeout

The Voice Test screen remains visible.

Current double-tap action becomes:

DOUBLE TAP ANYWHERE
→ Start voice test again

Flow:

Double tap
    ↓
Haptic
    ↓
Listening tone
    ↓
ASR starts

There is no Retry button to find.

25. Speech Heard but Command Not Matched

If ASR heard speech but the onboarding command could not be matched:

error/reminder cue

Announce:

I heard you, but I couldn't match that command. Double-tap anywhere to try again. After the tone, say Play my local news.

The screen stays on Step 2.

26. Voice Test Cancel

If the voice system supports:

Cancel.

then:

User says "cancel"
    ↓
Stop ASR
    ↓
Return to Voice Test Ready

Announce:

Voice test stopped. Double-tap anywhere when you're ready to try again.

27. Microphone Permission Denied

This is the state shown in the denied design.

The screen remains:

VOICE ACCESS · 2 OF 3

Heading:

Microphone access is off.

The visual UI explains:

Hear can still guide you. One double-tap opens Settings—there are no buttons to find.

This state has exactly one primary onboarding action:

OPEN SETTINGS

There is no:

Continue without voice button

and no:

Open Settings button

that the blind user must locate.

28. Permission Denied Announcement

As soon as denial is detected:

warning/error sound
+
appropriate haptic

Then Hear says:

Voice access. Step 2 of 3. Microphone access is off. Double-tap anywhere to open Settings.

The instruction is simple because there is only one required next action.

29. Permission Denied Interaction

User:

DOUBLE TAP ANYWHERE

Result:

Short haptic
    ↓
Open Hear's application Settings page

The user does not need to search for an on-screen Settings button.

30. Permission Denied With TalkBack / VoiceOver

When TalkBack/VoiceOver is active, the denied screen acts as one full-screen accessibility action.

Accessibility meaning:

Screen:
"Microphone access is off.
Double-tap anywhere to open Settings."

Action:
Open Settings

Therefore:

physical double tap
    ↓
TalkBack / VoiceOver activates focused screen action
    ↓
Settings opens

This preserves the same user experience.

31. Returning From Settings

The application must observe when it returns to the foreground.

Flow:

Hear opens Settings
      ↓
User changes microphone permission
      ↓
User returns to Hear
      ↓
AppState becomes active
      ↓
Immediately check microphone permission

The user must not have to press another button.

32. Permission Granted After Returning

If microphone access is now enabled:

success sound
+
success haptic

Announce:

Microphone access is now on. Let's try your first voice command. After the tone, say Play my local news.

Then:

Wait for announcement to finish
        ↓
Listening tone
        ↓
Automatically start ASR

This follows the design:

WHEN YOU RETURN — Hear starts your first voice test automatically.

33. Permission Still Denied After Returning

If permission is still disabled:

warning cue

Announce:

Microphone access is still off. Double-tap anywhere to open Settings.

The user remains on the same denied screen.

The screen action remains:

DOUBLE TAP ANYWHERE
→ Open Settings
34. No Skipping Voice Access

Hear is a voice-invocation application.

Therefore onboarding should not offer a normal:

Continue without voice

path from Step 2.

Voice Access is a required core setup step.

The user remains in Step 2 until microphone access and the initial voice setup have been completed.

This means:

Permission denied
→ Settings
→ Permission granted
→ Voice test
→ Voice test successful
→ Step 3
35. Step 3 — Optional Account

Once the voice test succeeds:

OPTIONAL ACCOUNT · 3 OF 3

Heading:

Keep your listening with you.

The account itself is optional.

Voice access is already working at this point.

Therefore account choice should be voice-first.

36. Account Screen Announcement

Recommended:

Optional account. Step 3 of 3. An account keeps your saved audio and listening progress with you. Say Apple, Google, or Not now.

The user does not need to locate the Apple, Google or Not now controls visually.

37. Account Voice Listening

After the announcement finishes:

short listening tone
    ↓
ASR begins

Accept only the small account vocabulary required by this onboarding state:

Apple

Google

Not now

Repeat
38. User Says Apple

Flow:

"Apple"
    ↓
ASR recognises selection
    ↓
confirmation haptic
    ↓
Begin native Apple sign-in

The native Apple authentication UI then owns the authentication process.

39. User Says Google

Flow:

"Google"
    ↓
ASR recognises selection
    ↓
confirmation haptic
    ↓
Begin native Google sign-in

The native Google authentication experience takes over as required.

40. User Says Not Now

Flow:

"Not now"
    ↓
recognised
    ↓
success haptic
    ↓
Complete onboarding

No visual button needs to be found.

41. Account Listening Timeout

If the user does not answer:

stop ASR

Announce:

I didn't hear a choice. Double-tap anywhere when you're ready.

Current action becomes:

DOUBLE TAP
→ Repeat account instructions and speak again
42. Account Unrecognised Response

If speech is received but is not:

Apple
Google
Not now

Hear says:

I didn't match that choice. Say Apple, Google, or Not now.

Then automatically speak again after the prompt finishes.

43. Authentication Cancelled

If Apple or Google authentication is cancelled:

Return to the Account state.

Announce:

Sign-in was cancelled. Say Apple, Google, or Not now.

Then resume the account voice-selection flow.

44. Authentication Failed

If authentication fails:

error sound

Announce:

Sign-in didn't complete. Say Apple or Google to try again, or say Not now.

Then speak again.

45. Completing Onboarding

Onboarding completes when:

Apple authentication succeeds

OR

Google authentication succeeds

OR

user says "Not now"

Then:

Persist onboarding completion
        ↓
Persist voice setup status
        ↓
Stop onboarding ASR
        ↓
Stop onboarding speech
        ↓
Clear onboarding state
        ↓
Navigate into Hear

Final announcement:

Setup complete. Hear is ready.

46. Navigation Must Always Be Automatic After Success

The user should never hear:

Tap Continue.

Instead:

successful state
    ↓
success feedback
    ↓
spoken confirmation
    ↓
automatic navigation

Examples:

Welcome double tap
→ Voice Access automatically
Permission granted
→ Voice Test automatically
Voice Test succeeds
→ Account automatically
Account complete
→ Main app automatically
47. State Speech Requirements

Every important state needs a specific spoken response.

Welcome

Welcome to Hear. Step 1 of 3. Double-tap anywhere to continue.

Voice Access

Voice access. Step 2 of 3. Double-tap anywhere to request microphone access.

Permission Granted

Microphone access granted. Let's try one command.

Permission Denied

Microphone access is off. Double-tap anywhere to open Settings.

Permission Still Denied After Return

Microphone access is still off. Double-tap anywhere to open Settings.

Permission Enabled From Settings

Microphone access is now on. Let's try your first voice command.

Listening

Use the listening sound rather than unnecessary speech.

No Speech

I didn't hear anything. Double-tap anywhere to try again.

Command Not Matched

I heard you, but I couldn't match that command. Double-tap anywhere to try again.

Voice Test Successful

Voice access is working. Moving to the final setup step.

Account

Optional account. Step 3 of 3. Say Apple, Google, or Not now.

Complete

Setup complete. Hear is ready.

48. State Machine
                    APP LAUNCH
                        │
                        ▼
                ┌───────────────┐
                │   WELCOME     │
                │    1 OF 3     │
                └───────┬───────┘
                        │
                  DOUBLE TAP
                        │
                        ▼
             ┌────────────────────┐
             │   VOICE ACCESS     │
             │      2 OF 3        │
             │ Permission Intro   │
             └─────────┬──────────┘
                       │
                 DOUBLE TAP
                       │
                       ▼
              NATIVE PERMISSION
                    /      \
                   /        \
                  /          \
           GRANTED            DENIED
              │                  │
              │                  ▼
              │         ┌─────────────────┐
              │         │ MICROPHONE OFF  │
              │         │    2 OF 3       │
              │         └────────┬────────┘
              │                  │
              │            DOUBLE TAP
              │                  │
              │                  ▼
              │              SETTINGS
              │                  │
              │            USER RETURNS
              │                  │
              │            CHECK AGAIN
              │             /        \
              │          OFF          ON
              │           │            │
              │           └────┐       │
              │                │       │
              │                ▼       │
              │          MICROPHONE    │
              │             OFF        │
              │                        │
              └────────────────────────┘
                       │
                       ▼
               ┌────────────────┐
               │   VOICE TEST   │
               │     2 OF 3     │
               └───────┬────────┘
                       │
                 AUTO LISTEN
                       │
              ┌────────┼────────┐
              │        │        │
           SUCCESS  NO SPEECH  ERROR
              │        │        │
              │        └── RETRY
              │
              ▼
        ┌───────────────────┐
        │ OPTIONAL ACCOUNT  │
        │      3 OF 3       │
        └─────────┬─────────┘
                  │
         VOICE SELECTION
      Apple / Google / Not now
                  │
                  ▼
        ┌───────────────────┐
        │     COMPLETE      │
        └─────────┬─────────┘
                  │
                  ▼
               HEAR APP
49. Implementation Rules

The implementation must follow these rules:

Onboarding is voice/gesture driven.
Do not require visible-button discovery for progression.
Double-tap anywhere performs the current onboarding action.
When TalkBack/VoiceOver is active, use a full-screen native accessibility action for single-action onboarding states.
Every state announces itself automatically.
Every failure explains what failed.
Every failure tells the user the next action.
Permission denial goes directly to the dedicated Microphone access is off state.
The denied state has one primary action: double-tap anywhere to open Settings.
Do not offer Continue without voice during core onboarding.
Recheck microphone permission automatically when the app returns from Settings.
If permission becomes granted, automatically begin the voice-test sequence.
Voice testing uses Hear's global ASR service.
Hear TTS must finish before ASR begins.
Voice-test retries use double-tap anywhere.
Successful voice setup automatically proceeds to Step 3.
Account selection is voice-first: Apple, Google, Not now.
Successful completion automatically enters the main application.
No successful state should require a separate Continue button.
At no point should a blind user have to visually search the screen to understand how to continue.
50. Final Experience

The intended user experience is:

Hear speaks.
User listens.

Hear tells the user exactly what to do.

User double taps anywhere
or speaks the requested command.

Hear confirms the action with sound/haptic feedback.

Hear performs the next action automatically.

Hear announces the new state.

The onboarding must feel like the user is having a guided interaction with Hear, not navigating a traditional visual setup wizard.

The screen is visual feedback. The voice, sound, gesture and state machine are the actual onboarding interface.