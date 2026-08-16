# Hear! Listener — Blind & Low-Vision User Research

Purpose: make the voice-first experience genuinely useful for blind and low-vision
listeners, and to de-risk the big product bets (voice-only onboarding, voice capture
while audio is playing, spoken navigation) with real user evidence.

## 1. Research goals

1. Understand how blind and low-vision listeners currently consume news/audio and
   what makes an audio app "beautiful, awesome and useful" to them.
2. Validate the voice-first model: onboarding without typing, double-tap-to-speak,
   screen read-aloud, and voice commands while a story is playing.
3. Discover the friction points in the current launch → splash → onboarding → Home
   flow (including the white-screen/loading states and any "stuck" launches).
4. Define concrete accessibility acceptance criteria for every screen (WCAG 2.2 +
   EN 301 549 + platform screen-reader guidelines).

## 2. Research questions

### A. Voice control
- When audio is playing, do users expect it to pause during a voice command?
- How long a listening window feels comfortable before the app gives up (5s/10s/18s)?
- Should the app confirm every command out loud, or only when something changes?
- Is "double-tap anywhere" discoverable? What alternative gestures feel natural?

### B. Onboarding
- Should every step be completable by voice alone (no text entry)?
- Is a 6-step onboarding too long when everything is spoken?
- How should skips be announced ("Not now", spoken confirmations)?
- Does a location step need a typed town fallback at all?

### C. Spoken navigation (non-screen-reader mode)
- What should "read the screen" say? (Summary? Every card? Headings first?)
- How often should the app announce things without being asked?
- Which confirmations are useful versus annoying ("Playing X by Y")?

### D. Launch experience
- What should the user hear/feel between splash and content?
- Do loading animations or dots matter at all to blind users?

## 3. Personas

| Persona | Profile | Key needs |
| --- | --- | --- |
| Amara, 34 — VoiceOver expert | Totally blind, uses iPhone + VoiceOver daily, listens to news while cooking | Every action by voice; concise announcements; no typing |
| Ben, 58 — TalkBack learner | Low vision + age-related hearing loss, newer to gestures | Large text, high contrast, slower speech, forgiving timeouts |
| Chioma, 27 — Hands-free commuter | Sighted but uses voice while cycling/walking | Pause-then-listen flow, minimal screen interaction |
| Dan, 71 — New to smartphones | Uses magnifier + one-finger swipes, avoids typing | Very simple onboarding, big targets, spoken help |

## 4. Method

- **Phase 1 — Expert audit (do now, in code):** WCAG 2.2 AA walkthrough of every
  screen, plus TalkBack/VoiceOver runs. Log issues in
  `docs/accessibility-audit.md` with screen, element, issue, fix.
- **Phase 2 — Interviews (n=5–8):** 30–45 min remote interviews, screen-share
  walkthroughs of the current app. Recruit via RNIB, local sight-loss charities,
  and community groups. Offer a small incentive.
- **Phase 3 — Moderated usability tests (n=5):** task-based sessions on the
  real device with their preferred screen reader.
- **Phase 4 — Diary study (n=4, 5 days):** blind users use the app daily at home;
  log voice command success/failure, timeouts, and workarounds.

### Test task script (Phase 3)
1. Launch the app and describe what you hear/see.
2. Complete onboarding using only your voice.
3. Play a story, then give a voice command while it plays.
4. Ask the app "what's on screen" on Home.
5. Find and play a topic from Discover without touching the screen.

### Metrics
- Task success rate, time-on-task, number of screen-reader gestures per task
- Voice recognition success rate, command error rate, timeout rate
- SUS (System Usability Scale) after each session
- Qualitative: "most annoying moment", "moment of delight"

## 5. Accessibility standards & test matrix

| Standard | Applies to |
| --- | --- |
| WCAG 2.2 AA | Contrast (4.5:1), focus visibility, text scaling, orientation |
| EN 301 549 | Mobile app equivalents of the above |
| iOS VoiceOver | Roles, labels, rotor, custom actions, escape gestures |
| Android TalkBack | Roles, labels, live regions, accessibility actions |
| Platform HIGs | 48dp targets, gestures, audio ducking behavior |

Test matrix: every screen × {VoiceOver, TalkBack, no screen reader + spoken mode}
× {reduce motion on/off, font scale 100%/200%}.

## 6. Synthesis & prioritisation

After each phase, tag findings:
- **P0 — Blocks a blind user** (e.g., unlabeled control, unreachable button)
- **P1 — Major friction** (e.g., no spoken feedback for a state change)
- **P2 — Polish** (e.g., nicer spoken phrasing)

Feed P0/P1 into the product backlog in `docs/product-plan.md` with the research
evidence attached.

## 7. Product implications to validate (current bets)

1. **Pause audio during voice capture.** When the user double-taps while a story
   plays: pause playback, stop TTS, open an 18-second listening window, then
   auto-resume. Expectation: fewer misrecognitions (no music bleeding into mic).
2. **Voice-only onboarding.** "Next", "Back", "Skip this step", "My town is X".
   Expectation: blind users finish setup without typing.
3. **Spoken read-aloud mode.** A "read the screen" command plus automatic
   announcements of playback changes. Expectation: usable without a screen reader.
4. **Loading bridge.** Animated dots + spoken "Getting Hear! ready" between splash
   and content. Expectation: no unexplained white screens or "stuck at 99%".

## 8. Outputs

- `docs/accessibility-audit.md` — living audit log (see Phase 1)
- This document — updated with findings after each research phase
- Backlog tickets in `docs/product-plan.md`
