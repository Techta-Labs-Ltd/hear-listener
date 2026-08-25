# iOS Speech Recognition

## Recognizer configuration

- Locale: `en-GB` (selects the UK-English Apple recognizer locale through the
  Expo wrapper).
- `iosTaskHint`: `search` for content requests, `confirmation` for short
  responses, `dictation` for future free text.
- `contextualStrings` from SQLite (see
  [dictionary-and-contextual-strings.md](./dictionary-and-contextual-strings.md));
  target 20-50 entries, hard ceiling 100.
- `requiresOnDeviceRecognition: false` for the normal connected profile.
- No model-download UI: Expo cannot trigger an iOS model download; Apple
  controls model availability.

## Audio session

Before recognition:

1. SpeechCoordinator quiets app TTS.
2. Pause/duck content per product policy.
3. Start recognition with category `playAndRecord`,
   options `[defaultToSpeaker, allowBluetooth]`, mode `measurement`.

After recognition:

1. End the recognition session.
2. Restore playback audio session.
3. Speak/execute the result.

`iosVoiceProcessingEnabled` stays `false` unless device tests show the app
hears its own speaker/TTS output.

## On-device recognition

- Check `supportsOnDeviceRecognition()`.
- Use `requiresOnDeviceRecognition: true` only when supported and deliberately
  selected.
- In on-device mode only microphone permission is required, reducing
  permission friction.
- If Apple Speech permission is denied/restricted and on-device is supported,
  Hear! falls back to the on-device profile instead of disabling voice.

## Official references

- [Apple SFSpeechRecognizer](https://developer.apple.com/documentation/speech/sfspeechrecognizer)
- [Apple SFSpeechRecognitionTaskHint](https://developer.apple.com/documentation/speech/sfspeechrecognitiontaskhint)
- [Apple contextualStrings](https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/contextualstrings)
- [Apple AVAudioSession](https://developer.apple.com/documentation/avfaudio/avaudiosession)
- [expo-speech-recognition](https://github.com/jamsch/expo-speech-recognition)
