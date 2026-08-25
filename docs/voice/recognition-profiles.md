# Recognition Profiles

All profiles share the base:

```ts
{
  lang: "en-GB",
  interimResults: true,
  maxAlternatives: 5,
  continuous: false,
  requiresOnDeviceRecognition: false,
  addsPunctuation: false,
  contextualStrings,
}
```

The locale is a hard invariant on both platforms; it is never derived from the
device UI locale, region, or keyboard.

## Purpose matrix

| Purpose | Android `EXTRA_LANGUAGE_MODEL` | iOS `iosTaskHint` |
|---|---|---|
| `command` | `free_form` | `search` |
| `entity-search` | `web_search` | `search` |
| `short-response` | `web_search` | `confirmation` |
| `dictation` (future) | `free_form` | `dictation` |

## Android

- Normal natural content commands: `free_form`.
- Short confirmations (ambiguity / feedback / yes-no): `web_search`.
- `EXTRA_MASK_OFFENSIVE_WORDS: true` is added only when
  `Platform.Version >= 33` (the extra is API 33+).
- Automatic language detection/switching extras are **not** passed; Hear!
  deliberately pins `en-GB`.
- `androidRecognitionServicePackage` selects the preferred available Google
  service (`com.google.android.as`, then `com.google.android.googlequicksearchbox`),
  otherwise the device default. Missing packages never hard-fail voice.

## iOS

- Normal content commands: `iosTaskHint: "search"`.
- Short confirmations: `iosTaskHint: "confirmation"`.
- Audio session: `playAndRecord`, `[defaultToSpeaker, allowBluetooth]`,
  `measurement`.
- `iosVoiceProcessingEnabled: false` by default; enable only behind a tested
  device/profile rule (it can lower speaker playback volume).

## Profile selection

Profiles are chosen from interaction state **before** recognition starts:

```text
screen expectation "entity-search"  -> entity-search
screen expectation "short-response" -> short-response
clarifying / pending ambiguity / pending feedback -> short-response
otherwise -> command
```

`VoiceRecognitionExpectation` on the screen capability is a hint only; screens
never contain catalog-specific recognition code.

## Official references

- [Android RecognizerIntent EXTRA_LANGUAGE_MODEL](https://developer.android.com/reference/android/speech/RecognizerIntent#EXTRA_LANGUAGE_MODEL)
- [Android RecognizerIntent EXTRA_MASK_OFFENSIVE_WORDS](https://developer.android.com/reference/android/speech/RecognizerIntent#EXTRA_MASK_OFFENSIVE_WORDS)
- [Android RecognizerIntent EXTRA_BIASING_STRINGS](https://developer.android.com/reference/android/speech/RecognizerIntent#EXTRA_BIASING_STRINGS)
- [Apple SFSpeechRecognitionTaskHint](https://developer.apple.com/documentation/speech/sfspeechrecognitiontaskhint)
- [Apple contextualStrings](https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/contextualstrings)
- [Apple AVAudioSession](https://developer.apple.com/documentation/avfaudio/avaudiosession)
- [expo-speech-recognition](https://github.com/jamsch/expo-speech-recognition)
