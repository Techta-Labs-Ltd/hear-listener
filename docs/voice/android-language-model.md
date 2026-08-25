# Android en-GB Language Model

Android 13+ (API 33+) supports inspecting and downloading the system-managed
offline speech model from inside the app. Hear! never bundles the model in the
APK.

## State machine

```text
unknown -> checking -> missing -> download-requested | download-scheduled | installed
                                  |                            |
                                  +-------> installed  <-------+
                                  +-------> error / unsupported
```

See `AndroidSpeechModelState` in `src/types/voice-speech.ts`.

## Flow

1. `getSupportedLocales({ androidRecognitionServicePackage })` returns
   `locales` (supported) and `installedLocales` (offline).
2. If `en-GB` is installed -> `installed`.
3. If `en-GB` is supported but not installed -> `missing`.
4. `androidTriggerOfflineModelDownload({ locale: "en-GB" })`:
   - `opened_dialog` (Android 13): the system dialog opens; the app may
     background. Mark `download-requested`; do not assume installation.
   - `download_success`: re-check installed locales before marking
     `installed`.
   - `download_scheduled`: queued (e.g. waiting for Wi-Fi). Mark
     `download-scheduled` and re-check on a later foreground.
5. Re-check on `AppState = active` while `download-requested` or
   `download-scheduled` (VoiceProvider wires this).
6. Repeated triggers are throttled (60s minimum interval).

## Fallback

If the model is unavailable, normal voice use continues with the default/
network recognizer in `en-GB`. The app never falls back to `en-US`.

## Official references

- [Android SpeechRecognizer (on-device APIs)](https://developer.android.com/reference/android/speech/SpeechRecognizer)
- [expo-speech-recognition](https://github.com/jamsch/expo-speech-recognition)
