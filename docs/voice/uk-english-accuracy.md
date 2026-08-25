# UK-English Accuracy Policy

## Locale invariant

- Android ASR locale = `en-GB`.
- iOS ASR locale = `en-GB`.

The locale is not derived from phone UI language, device region, keyboard,
SIM country, or system locale. Automatic language detection/switching is not
enabled in the normal profile.

## On-device vs network is not the locale decision

```text
locale choice:       always en-GB
recognition transport: network/default OR on-device
```

- Android offline with en-GB installed -> may use
  `requiresOnDeviceRecognition: true`.
- Connected/default -> `requiresOnDeviceRecognition: false`.
- iOS uses on-device only when supported and deliberately selected.
- On-device is not assumed to be more accurate; benchmark all four
  configurations against the shared corpus.

## Shared pipeline

Both platforms share the same command dictionary, filler dictionary, semantic
grammar, SQLite entity dictionary, validated ASR aliases, resolver, ambiguity
thresholds, and request validation. Platform differences are limited to native
recognizer configuration.

## Corpus

One shared UK-English regression corpus drives accuracy work; see
[testing.md](./testing.md).

## Official references

- [Android SpeechRecognizer](https://developer.android.com/reference/android/speech/SpeechRecognizer)
- [Apple SFSpeechRecognizer](https://developer.apple.com/documentation/speech/sfspeechrecognizer)
