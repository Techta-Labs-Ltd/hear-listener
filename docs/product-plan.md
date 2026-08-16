# Hear Listener Mobile — Product & UX Plan v2

## Product rule
Hear is an audio app with a voice control layer, not a chatbot. Every important action must work by touch and by voice. Voice should perform the action immediately, with short feedback only when needed.

## Navigation
Bottom navigation has exactly three destinations: Home, Discover, Library. Voice is a global action, not a tab. Settings are reached from the top-right control in Library/Home. A mini-player sits above bottom navigation while audio is active.

## Onboarding (recommended six-step flow)
1. Quick accessibility/system check: explain large controls, screen-reader support and that setup is optional.
2. Microphone + sound output: request microphone permission in context; run a 2-second voice level test; play a short sample through the current output; let the user choose another output if needed.
3. Location + network: request approximate location for local content, offer manual town entry and Not now. Show current connectivity. Do not build a custom Wi-Fi picker; offer an OS settings route for changing networks.
4. Voice command test + system assistant: test “Play my local news”. Provide Siri/App Shortcut and Android Assistant/App Action setup/try actions. Do not claim assistant setup is active unless the OS exposes a reliable state.
5. Personalisation: choose 3–5 interests and optionally follow suggested local organisations/creators. All optional.
6. Ready: summarize what is configured and start on Home. Notifications should be requested later, after the user follows something, rather than during first-run setup.

### Voice-first onboarding (current implementation)
- Every step is completable by voice alone: "continue"/"next", "back", "skip this step"/"not now", "my town is {location}", and "read this step again". Onboarding commands get a resolver boost while on `/onboarding` and are suppressed elsewhere so playback commands keep winning.
- Town entry is voice-first ("my town is Bristol"); typing remains an optional fallback and approximate location is one tap.
- Each step speaks "Step X of 6. Title. Description. Instructions." after voice feedback finishes. Validation failures are spoken, not just shown.
- Skip semantics per step: microphone/sound/location/practice mark themselves skipped; welcome and finished steps advance/complete instead.

## Home
Priority order: Continue Listening; New From Following; Your Local News; Recommended For You; Latest; Popular Near You; Publications/Organisations. Use horizontally scrolling artwork rails for content and short vertical rows for timely updates. Keep one prominent “Speak to Hear” card near the top with 2–3 example commands.

## Discover
Search input + voice search, then Categories, Local, Latest, Popular, Featured Organisations, Publications and Creators. Search results are grouped by Creators, Organisations, Publications and Content, with large Play/Follow actions.

## Library
Four first-level destinations: Saved, Following, Downloads, History. Following can filter All / Creators / Organisations / Publications. Do not expose these as separate bottom tabs.

## Now Playing
Large artwork, title, creator, publication/organisation, date, progress, previous/play-next, playback speed, save, sleep timer, queue, and voice action. Contextual voice commands must understand pronouns such as “them”, “their” and “this”.

## Voice states
Idle -> Listening -> Resolving -> Action. Listening and resolving are full-screen transient states, never message threads. For ambiguity, show a short spoken question plus large tappable choices. For errors, explain the next action in plain language.

### Voice capture while audio is playing (implemented)
- Starting a voice command pauses playback and stops TTS so the microphone hears only the user; playback auto-resumes after the command completes, times out, or is cancelled — unless the command itself changed playback (play/pause/next/seek/speed).
- Listening window: 30s max, 8s no-speech timeout, 5s resolution timeout, each with a spoken explanation. On-device recognition with voice processing enabled; silence length and minimum speech length are tuned in the recognition options.

### Spoken read-aloud (implemented)
- "read the screen" (and variants) reads a screen-aware summary: Home (continue listening + local news), Player (title, creator, position, speed), Library (counts), Topic (story list), Settings, and the current onboarding step with its spoken options.
- Playback changes (play/pause) are announced out loud when they are not triggered by a voice command.
- Screen-reader users get native labels/roles instead; the app never double-announces.

## Voice intent coverage
Carry across the Alexa intent model: play content, play latest, local, recommendations, browse, trending, organisation/publication/creator playback, next/previous/repeat/restart, speed changes, rewind/fast-forward, what is this about, who made/published this, follow/unfollow, location change, report content/creator, clarification.

Add mobile intents not present in the current Alexa model: SaveContent, RemoveSaved, DownloadContent, RemoveDownload, PlaySaved, PlayDownloads, FollowOrganisation, UnfollowOrganisation, FollowPublication, UnfollowPublication, EnableNotificationsForEntity, DisableNotificationsForEntity, OpenQueue, AddToQueue, ClearQueue, SetSleepTimer, CancelSleepTimer, OpenLibrarySection, OpenDiscoverCategory.

## Accessibility system
Use 48x48 minimum touch targets (larger for primary controls), high contrast, text labels for ambiguous icons, logical focus order, meaningful accessibility names, no colour-only state, no swipe-only critical actions, scalable text, reduced-motion support, clear audio cues, and interruption-safe spoken feedback. Screen-reader announcements should be concise and should not repeatedly re-read static page chrome.

## Content card system
Content card: artwork, NEW/played state, title, creator, organisation/publication, date, duration, Play, Save. Entity card: image/logo, name, entity type, location/association, Follow, Play Latest. Keep metadata to 2–3 lines maximum on rails; show more detail in the full page.

## Visual system
Match the existing Hear dashboard identity: white/lilac surfaces, purple primary accent, rounded cards, thin lavender borders, restrained shadows and soft purple gradients. Use a dark theme only as an optional appearance, not the default. Keep the experience premium and editorial rather than looking like an accessibility utility.

## Platform integration notes
- iOS: use App Intents/App Shortcuts for Siri-accessible actions; standard system media controls for lock screen/background playback; Speech/AVAudioSession for in-app voice where appropriate.
- Android: use App Actions/shortcuts for Assistant entry points, SpeechRecognizer/on-device recognizer when available for in-app commands, and standard media session controls for lock screen/background playback.
- Do not implement an always-listening background microphone. Voice starts from an explicit mic action or the system assistant.
- Audio playback is powered by expo-audio (AudioRuntime syncs the player with the playback store: play/pause/seek/speed/loop/next). The catalogue currently ships a demo WAV per story; replace with real stream URLs/content delivery in Phase 3.

## Delivery sequence
Phase 1: navigation shell, onboarding, Home, voice state machine, Now Playing, local content, accessibility QA.
Phase 2: Discover/search/entity profiles, Following, Saved, History, Downloads.
Phase 3: notifications, Siri/App Intents, Android App Actions, lock-screen controls, offline behavior.
Phase 4: personalization ranking, richer contextual voice, analytics/accessibility telemetry, polish.
