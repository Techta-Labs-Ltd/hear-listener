# Hear! voice-first design reference

This document records the approved design mapping. It is a guardrail for future changes, not permission to copy another product's assets or brand identity.

| Reference | Principle used by Hear! | Hear! surfaces |
| --- | --- | --- |
| Willow onboarding | Bold, left-aligned voice instruction on an atmospheric canvas | Welcome and Voice Access |
| Raycast voice flow | Explicit invocation, permission primer, listening, transcript, resolution, result | Voice Access and global voice session |
| ElevenReader onboarding | One decision at a time and clear optional paths | Welcome, Voice Access, Optional Account |
| Vapi and ElevenLabs | One high-contrast voice-state focal point with restrained supporting UI | Global voice session |
| Stable Audio | Warm editorial content canvas and disciplined typography | Home, Discover, Library, Player, Settings |

## Product rules

- Native and React splash use `#32145D` and the white text-only `Hear!` wordmark.
- Splash is silent and non-interactive. Speech begins on the interactive Welcome surface.
- Voice moments use aubergine; content browsing uses warm parchment.
- No microphone artwork, floating voice button, bottom voice dock, waveform bars, ornamental rings, or decorative cards.
- Double-tap opens voice when a screen reader is off. VoiceOver and TalkBack use the labelled accessibility action.
- Every primary screen supplies a concise orientation, contextual examples, and a detailed “Read this screen” response.

## Refero access

The local MCP configuration reads `REFERO_MCP_TOKEN` from the environment. Rotate the previously embedded token before reconnecting the server. Visual implementation should be reviewed against captured Refero frames when that MCP is available in the active agent runtime.

## Google account builds

Android Google sign-in is enabled only when `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is present at prebuild time. Without it, the app remains fully usable and the optional account surface reports that Google sign-in is not configured for that build.
