# Hear! Listener — Voice Documentation

This directory documents the cross-platform UK-English voice stack.

## Contents

- [architecture.md](./architecture.md) — component architecture and state machine
- [direct-hear-api-contract.md](./direct-hear-api-contract.md) — real resolver, confirmation, search, and playback contract
- [permissions.md](./permissions.md) — Android/iOS permission flows and recovery
- [recognition-profiles.md](./recognition-profiles.md) — en-GB recognition option profiles
- [uk-english-accuracy.md](./uk-english-accuracy.md) — locale policy and accuracy strategy
- [android-language-model.md](./android-language-model.md) — Android 13+ en-GB model management
- [ios-speech-recognition.md](./ios-speech-recognition.md) — iOS recognizer and audio session
- [dictionary-and-contextual-strings.md](./dictionary-and-contextual-strings.md) — recognition dictionaries and SQLite bias terms
- [transcript-filtering.md](./transcript-filtering.md) — sanitization and filler removal
- [sqlite-resolver.md](./sqlite-resolver.md) — entity resolution pipeline
- [ambiguity.md](./ambiguity.md) — ambiguity interactions
- [feedback.md](./feedback.md) — voice feedback flow
- [accessibility.md](./accessibility.md) — TalkBack/VoiceOver UX
- [diagnostics.md](./diagnostics.md) — speech and resolver telemetry
- [testing.md](./testing.md) — shared UK-English accuracy corpus

## Key invariants

- Recognition locale is always `en-GB`, independent of device UI locale.
- One voice invocation resolves exactly one command (`continuous: false`).
- Up to 5 ASR hypotheses flow through local routing and FTS5 preparation.
- Content discovery uses the real resolver and Hear search APIs after spoken confirmation; SQLite never starts demo content for it.
- Catalog entities are never hardcoded in production TypeScript.
- The 8-second timer limits only the time to **begin** speaking.
- Permissions and model downloads never consume the 8-second window.

## Official references

- [expo-speech-recognition](https://github.com/jamsch/expo-speech-recognition)
- [Android SpeechRecognizer](https://developer.android.com/reference/android/speech/SpeechRecognizer)
- [Android RecognizerIntent](https://developer.android.com/reference/android/speech/RecognizerIntent)
- [Android RECORD_AUDIO](https://developer.android.com/reference/android/Manifest.permission#RECORD_AUDIO)
- [Apple Speech Recognition permission](https://developer.apple.com/documentation/speech/asking-permission-to-use-speech-recognition)
- [Apple NSMicrophoneUsageDescription](https://developer.apple.com/documentation/bundleresources/information-property-list/nsmicrophoneusagedescription)
- [Apple SFSpeechRecognizer](https://developer.apple.com/documentation/speech/sfspeechrecognizer)
- [Apple contextualStrings](https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/contextualstrings)
- [Apple SFSpeechRecognitionTaskHint](https://developer.apple.com/documentation/speech/sfspeechrecognitiontaskhint)
- [Apple AVAudioSession](https://developer.apple.com/documentation/avfaudio/avaudiosession)
