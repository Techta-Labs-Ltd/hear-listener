# Permissions

## Android

- Required runtime permission: `android.permission.RECORD_AUDIO`.
- Android has no separate runtime Speech Recognition permission.
- Request through `ExpoSpeechRecognitionModule.getMicrophonePermissionsAsync()` /
  `requestMicrophonePermissionsAsync()`.
- The en-GB language model download is system-managed (Android 13+); there is
  no additional "language pack" permission.
- Do not request Bluetooth permissions for ASR; the recognizer uses the active
  system microphone/audio route.
- `canAskAgain === false` -> provide accessible Settings guidance; never loop
  the system dialog.

## iOS

Two distinct permissions:

- Microphone (`NSMicrophoneUsageDescription`) — always required.
- Apple Speech Recognition (`NSSpeechRecognitionUsageDescription`) — required
  for network-backed recognition.

Flow (`ensureVoicePermissions` in speech-recognition-bootstrap.ts):

```text
request microphone
  -> denied  -> fail with "microphone-denied"

if requiresOnDeviceRecognition:
  -> done (microphone only)
else:
  check speech recognizer permission
    -> granted -> done
    -> restricted:
         on-device supported -> fallback to on-device (microphone only)
         else -> fail with "speech-restricted"
    -> not granted:
         request permission
           -> denied/restricted:
                on-device supported -> fallback to on-device
                else -> fail with "speech-denied" / "speech-restricted"
```

`restricted` (Screen Time / MDM) is handled separately from a normal denial:
explain the device restriction and offer Settings guidance.

## Timing and accessibility

- Permission dialogs happen before the microphone opens and never consume the
  8-second pre-speech window.
- Hear! explains the permission first, waits for TTS completion, then opens
  the native dialog, and stays silent while the native UI has focus.
- On return, inspect the actual permission state; never assume grant.

## Config plugin (app.json)

```json
[
  "expo-speech-recognition",
  {
    "microphonePermission": "Hear! uses the microphone so you can control the app and find audio using your voice.",
    "speechRecognitionPermission": "Hear! uses speech recognition to understand your voice commands.",
    "androidSpeechServicePackages": [
      "com.google.android.googlequicksearchbox",
      "com.google.android.as"
    ]
  }
]
```

iOS usage descriptions are generated from these values
(`NSMicrophoneUsageDescription`, `NSSpeechRecognitionUsageDescription`).

## Official references

- [Android RECORD_AUDIO](https://developer.android.com/reference/android/Manifest.permission#RECORD_AUDIO)
- [Apple Speech Recognition permission](https://developer.apple.com/documentation/speech/asking-permission-to-use-speech-recognition)
- [Apple NSMicrophoneUsageDescription](https://developer.apple.com/documentation/bundleresources/information-property-list/nsmicrophoneusagedescription)
- [expo-speech-recognition](https://github.com/jamsch/expo-speech-recognition)
