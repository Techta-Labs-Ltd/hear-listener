# Hear! Listener — Accessibility Audit Log

Living audit log. Format: screen · element · issue · status.

Companion to `docs/user-research.md` (research plan, personas, test matrix).

## Fixed in this pass

| Screen | Element | Issue | Fix |
| --- | --- | --- | --- |
| Home/Discover/Library | StoryCard | Play glyph `▶` was read aloud by screen readers as text | Wrapped in `accessibilityElementsHidden` / `no-hide-descendants` |
| Home/Discover/Library | StoryCard | No hint or progress announced | Added `accessibilityHint` ("Plays X and opens the player") and `accessibilityValue` (percent listened) |
| Player/MiniPlayer | ProgressTrack | Progress bar had no role/value | Added `progressbar` role, label and min/max/now values |
| All screens | MiniPlayer | Pause state not announced | Label now includes ", paused" |
| Player | ProgressTrack | Hard-coded 18 min duration | Real duration now comes from expo-audio status |
| All screens | Voice reading | Voice never read screen content | New "read the screen" command + spoken readouts for every route |
| Onboarding | LocationStep | Typing required | Voice-first town entry ("my town is X"); text input is optional fallback |
| Onboarding | Step changes | Spoken step intro cut off command feedback | Step announcement delayed ~900ms so feedback finishes |
| Onboarding | Validation errors | Errors were visual only | Validation message now also spoken |
| Launch | index route | White screen while preferences hydrate | Replaced `null` with branded `LoadingScreen` (animated dots + spoken "Getting Hear! ready") |
| Launch | Splash | Native splash could stay if layout never fired | `SplashScreen.hide()` on layout + `hide()` fallback timer |
| All screens | Buttons | Loading state hidden from screen readers | `accessibilityState={{ busy, disabled }}` already present; verified |

## Verified good (audited, no change needed)

- `Button`, `IconButton`, `ListRow`, `TopicGrid`: 48dp targets, roles, labels, selected/disabled states
- `Input`: label + hint + error text association
- `OnboardingStepper`: progressbar role with min/max/now + live region label
- `AppText`: `allowFontScaling` with 2x cap on every text component
- Reduced-motion branches in `AnimatedLaunchScreen` and `LoadingScreen`
- Voice gesture (double-tap) enabled only when voice is idle; screen-reader users get native gestures

## Open findings (to verify on device)

1. **MiniPlayer nested button** — pause button nested inside the row Pressable.
   Works with VoiceOver/TalkBack but needs a real-device check for double
   activation. Candidate: move pause to an accessibility action on the row.
2. **PlayerScreen artwork** — category text on solid color swatch; verify
   4.5:1 contrast for the light colors (#F8F5FB canvas tones) at large scale.
3. **Voice readout length** — Home readout can be long; consider "short/summary"
   verbosity levels in Settings.
4. **Onboarding gesture conflict** — while a voice session is active, the
   double-tap gesture is disabled by design; confirm skip/back flow is
   understandable for TalkBack users who rely on explore-by-touch.
5. **Font scale 200%** — verify onboarding stepper header doesn't clip.

## Verification procedure

Run with `npx expo start -c`, then on device:
1. Enable TalkBack (Android) / VoiceOver (iOS), walk every screen.
2. Complete onboarding using only voice.
3. Say "read the screen" on Home, Player, Library, Discover, Settings.
4. Play a story, double-tap, confirm audio pauses and resumes after the command.
5. Test reduce-motion and 200% font scale.
