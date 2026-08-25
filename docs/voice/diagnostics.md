# Diagnostics

Voice diagnostics capture, per resolution:

```text
speech.platform
speech.profile (recognition purpose)
speech.locale (always en-GB)
speech.recognition_service (Android)
speech.on_device_supported
speech.contextual_string_count
speech.native_started
speech.speech_started
speech.no_speech_timeout
speech.final_result
speech.alternative_count
resolver.candidate_count
resolver.winning_method
resolver.final_score
latency bands
```

Android model state and permission state live in
`speech-capability-store` and are inspectable independently of session state.

## Privacy

- Production logs never persist unrestricted raw speech indefinitely; use
  redaction/sampling per product policy.
- Unsanitized transcripts are never written to telemetry.
- Development-only raw retention is in-memory only.
