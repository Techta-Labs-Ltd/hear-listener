# Accessibility

## Permission UX (TalkBack / VoiceOver)

```text
1. Hear! explains what permission is about to appear.
2. Wait for app TTS/announcement completion.
3. Open the native permission UI.
4. Hear! stays silent while native permission UI has focus.
5. On return, inspect the actual permission state.
6. Continue only after native state confirms it.
```

- No repeated accessibility announcements that fight the system dialog.
- One announcement owner per message: do not duplicate through app TTS and
  the screen reader.
- Local non-voice gestures and TalkBack navigation remain fully usable when
  permissions are denied.

## Recognition UX

- While the microphone is active, no competing non-essential TTS.
- "Speak now" is announced only after the native recognizer is ready.
- Ambiguity options announce "Option i of n" and support tilt/swipe/voice
  selection.

## Audio coordination

The player and the speech recognizer never fight over the iOS audio session;
Hear! quiets TTS before recognition and restores playback after it.
