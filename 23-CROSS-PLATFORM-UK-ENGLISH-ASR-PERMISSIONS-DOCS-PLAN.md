# Hear! Listener — Cross-Platform en-GB ASR, Recognition Options, Dictionary & Filtering Plan

## 1. Goal

Build one cross-platform speech-recognition layer for Hear! Listener that:

- uses British English (`en-GB`) on Android and iOS;
- uses the correct native speech-recognition options for each platform;
- downloads/checks the Android `en-GB` on-device model from inside the app when supported;
- uses iOS on-device recognition when Apple reports it is supported;
- never blocks normal voice use just because an offline model is unavailable;
- gives the user 8 seconds to **begin speaking**;
- does not cut off a user who is already speaking;
- captures multiple ASR alternatives;
- biases recognition with a dynamic Hear! dictionary sourced from SQLite;
- safely filters filler words without destroying catalog/entity names;
- resolves catalog entities using SQLite FTS5 + trigram + phonetic/metaphone + aliases;
- preserves the existing voice lifecycle, ambiguity, feedback, accessibility, and request-ledger architecture.

---

# 2. Platform Capability Summary

## Android

Use `expo-speech-recognition` with:

- `lang: "en-GB"`;
- Google/default recognition service;
- Android 13+ offline model inspection;
- Android 13+ model download trigger;
- Android-specific `RecognizerIntent` options;
- `contextualStrings`.

Android 13+ can trigger the system-managed `en-GB` model download from inside Hear!.

The app does **not** bundle Google's model inside the APK.

## iOS

Use Apple Speech through `expo-speech-recognition` with:

- `lang: "en-GB"`;
- `iosTaskHint`;
- `contextualStrings`;
- `iosCategory`;
- optional `iosVoiceProcessingEnabled`;
- `requiresOnDeviceRecognition` only when supported and intentionally selected.

There is no `androidTriggerOfflineModelDownload()` equivalent for iOS in `expo-speech-recognition`.

Hear! can detect/use on-device recognition when supported, but Apple controls model availability.

Therefore:

```text
Android:
check -> request model download -> re-check -> use on-device when desired

iOS:
check on-device support -> use it when available
otherwise -> use Apple's network-backed recognizer
```

---


# 2A. Hard UK-English Locale Policy — BOTH Android and iOS

Hear! is a UK-English voice product.

The recognition locale must therefore be explicit on **both platforms**:

```ts
lang: "en-GB"
```

Do not derive the ASR locale automatically from:

```text
phone UI language
device region
keyboard language
SIM country
current system locale
```

unless Hear! later introduces a deliberate user-facing language/dialect preference.

Current invariant:

```text
ANDROID ASR locale = en-GB
iOS ASR locale     = en-GB
```

This is independent of whether the user has:

```text
English US UI
French UI
Nigerian region
Dutch region
etc.
```

Hear! speech recognition still requests:

```text
en-GB
```

for the current product.

---

# 2B. Do Not Enable Automatic Language Switching

Because Hear! explicitly wants UK English, do not enable language switching/detection as part of the normal command profile.

Android 14+ can expose language detection/switching, but that would work against the current requirement.

Normal profile:

```text
EXTRA_ENABLE_LANGUAGE_DETECTION = not passed
EXTRA_ENABLE_LANGUAGE_SWITCH    = not passed
```

Reason:

```text
Hear! wants stable en-GB recognition,
not automatic fallback to en-US/en-AU/etc.
```

Language-detection telemetry may be tested separately in development if useful, but it must not silently change the active recognition locale.

---

# 2C. Shared UK-English Accuracy Strategy

The accuracy design is the same conceptually on both platforms:

```text
                 en-GB
                   |
         native speech recognizer
                   |
         contextual Hear! vocabulary
                   |
          multiple ASR hypotheses
                   |
         shared transcript pipeline
                   |
        SQLite exact / FTS5 / trigram
          / phonetic / ASR aliases
                   |
          canonical Hear! entity
```

The platform differences are only how the native recognizer is configured.

Android and iOS must use the **same**:

```text
Hear! command dictionary
safe filler dictionary
semantic grammar
SQLite entity dictionary
validated ASR aliases
resolver
ambiguity thresholds
request validation
```

Do not create an Android-specific semantic language and a different iOS semantic language.

---

# 2D. Cross-Platform Base Accuracy Profile

The common base must be:

```ts
const COMMON_UK_COMMAND_PROFILE = {
  lang: "en-GB",
  interimResults: true,
  maxAlternatives: 5,
  continuous: false,
  requiresOnDeviceRecognition: false,
  addsPunctuation: false,
  contextualStrings,
};
```

This base is applied on both platforms.

Then add only platform-specific native settings.

---

# 2E. Android UK Accuracy Layer

Android normal command profile:

```ts
{
  ...COMMON_UK_COMMAND_PROFILE,

  androidIntentOptions: {
    EXTRA_LANGUAGE_MODEL: "free_form",

    // Android 13+ only.
    EXTRA_MASK_OFFENSIVE_WORDS: true,
  },
}
```

Short-response profile:

```ts
{
  ...COMMON_UK_COMMAND_PROFILE,

  androidIntentOptions: {
    EXTRA_LANGUAGE_MODEL: "web_search",

    // Android 13+ only.
    EXTRA_MASK_OFFENSIVE_WORDS: true,
  },
}
```

Apply the offensive-word option only when:

```text
Android API >= 33
```

Use Android model management:

```text
Android 13+
 -> inspect en-GB installed model
 -> trigger system-managed en-GB download if missing
 -> re-check before marking installed
```

Do not switch normal Hear! recognition to another English locale merely because the UK model is missing.

Fallback is:

```text
en-GB network/default recognition
```

not:

```text
en-US
```

---

# 2F. iOS UK Accuracy Layer

iOS must also use:

```ts
lang: "en-GB"
```

Normal content request:

```ts
{
  ...COMMON_UK_COMMAND_PROFILE,

  iosTaskHint: "search",

  iosCategory: {
    category: "playAndRecord",
    categoryOptions: [
      "defaultToSpeaker",
      "allowBluetooth",
    ],
    mode: "measurement",
  },

  iosVoiceProcessingEnabled: false,
}
```

Short confirmation/ambiguity/feedback response:

```ts
{
  ...COMMON_UK_COMMAND_PROFILE,

  iosTaskHint: "confirmation",

  iosCategory: {
    category: "playAndRecord",
    categoryOptions: [
      "defaultToSpeaker",
      "allowBluetooth",
    ],
    mode: "measurement",
  },

  iosVoiceProcessingEnabled: false,
}
```

On iOS, `lang: "en-GB"` selects the UK-English Apple speech recognizer locale through the Expo wrapper.

Do not leave iOS to the phone's default recognizer locale.

---

# 2G. iOS Contextual Vocabulary Rules

Apple's contextual vocabulary support is particularly useful for Hear!'s unusual names.

Use:

```ts
contextualStrings
```

on iOS for:

```text
organization names
publication names
creator names
places
current ambiguity candidates
currently visible entities
recent entities
```

Apple recommends keeping contextual phrases relatively brief and limiting the total list.

Hear! policy:

```text
target: 20-50 highly relevant entries
hard safety ceiling: <= 100 entries on iOS
```

Prefer short, distinctive terms when possible:

```text
Tynedale
Herne Bay
RNIB
York
```

over unnecessarily long sentence-like phrases.

For a multiword canonical name, include a compact combination where useful:

```text
Tynedale
Tynedale Talking Magazine
```

but rank short distinctive terms more highly in the bias-term generator.

---

# 2H. Contextual Vocabulary Scoring — Both Platforms

Do not randomly select dictionary items.

Score terms:

```text
active entity             +100
ambiguity candidate        +95
current publication        +90
current organization       +85
current creator            +80
visible screen result      +70
recently played            +55
recently searched          +45
screen-relevant popular    +20
```

Then:

```text
deduplicate
prefer distinctive terms
apply per-platform count limit
```

Cache by:

```text
screenInstanceId
+
stateVersion
+
SQLiteRevision
```

so invocation does not rebuild the same dictionary unnecessarily.

---

# 2I. On-Device vs Network Recognition Is NOT the Locale Decision

Keep these separate:

```text
locale choice:
always en-GB

recognition transport:
network/default OR on-device
```

Do not write:

```text
on-device unavailable -> switch to en-US
```

Correct:

```text
on-device unavailable
 -> keep en-GB
 -> use network/default recognition
```

Android:

```text
offline + en-GB installed
 -> requiresOnDeviceRecognition = true

connected/default
 -> requiresOnDeviceRecognition = false
```

iOS:

```text
offline/on-device mode requested
AND Apple reports support
 -> requiresOnDeviceRecognition = true

otherwise
 -> requiresOnDeviceRecognition = false
```

---

# 2J. Do Not Assume On-Device Is Always More Accurate

For both Android and iOS:

```text
on-device
!= automatically more accurate
```

The product should benchmark:

```text
Android network/default en-GB
Android on-device en-GB
iOS network en-GB
iOS on-device en-GB
```

using the same Hear! corpus.

The default profile remains:

```ts
requiresOnDeviceRecognition: false
```

for connected normal command recognition unless measurements show a better device-specific policy.

On-device mode is still essential for:

```text
offline operation
privacy-sensitive mode if introduced
certain short-response flows if measurements show improvement
```

---

# 2K. UK Accuracy Corpus — BOTH Platforms

Build one shared UK-English ASR regression corpus.

Include:

```text
different UK accents
slow speech
elderly speakers
fast speech
quiet rooms
background TV/radio
speaker output
Bluetooth headsets
wired headsets where applicable

organization names
publication names
creator names
locations
acronyms
short ambiguity choices
feedback commands
long natural content requests
```

Examples should include known difficult names such as:

```text
Tynedale
Herne Bay
```

but these belong in test fixtures / SQLite data, not production resolver special cases.

Run the same corpus against:

```text
Android cloud/default en-GB
Android on-device en-GB

iOS network en-GB
iOS on-device en-GB
```

Measure:

```text
top transcript accuracy
top-5 hypothesis recall
canonical entity top-1 accuracy
canonical entity top-3 recall
false local-command rate
ambiguity rate
wrong auto-execution rate
ASR startup latency
final result latency
SQLite resolver latency
```

---

# 2L. UK-English Accuracy Definition of Done

- [ ] Android always starts normal Hear! recognition with `lang: "en-GB"`.
- [ ] iOS always starts normal Hear! recognition with `lang: "en-GB"`.
- [ ] Device UI locale does not silently override Hear!'s ASR locale.
- [ ] Android model absence does not cause fallback to `en-US`.
- [ ] iOS on-device unavailability does not cause fallback to another English locale.
- [ ] Automatic language switching is disabled for the normal Hear! profile.
- [ ] Both platforms receive SQLite-backed `contextualStrings`.
- [ ] iOS contextual terms stay within the Apple-supported practical limit and are kept brief/relevant.
- [ ] Both platforms keep up to 5 hypotheses.
- [ ] Both platforms send semantic hypotheses through the exact same SQLite resolver.
- [ ] Both platforms use the same validated-ASR alias data.
- [ ] On-device vs network choice is measured separately from locale choice.
- [ ] Accuracy is benchmarked using one shared UK-English corpus.
- [ ] Android `web_search` is available as a dedicated `entity-search` and short-response profile.
- [ ] Android normal natural commands remain on `free_form` unless benchmarks justify a different policy.
- [ ] iOS entity searches use `iosTaskHint: "search"`.
- [ ] Low-confidence entity retries can deliberately switch to the constrained search-term profile.
- [ ] `web_search` is benchmarked against `free_form` using Hear!'s UK entity corpus.


# 2M. Search-Term Recognition Profile — Better Accuracy for Names and Short Keywords

Hear! should support a dedicated recognition purpose:

```ts
type RecognitionPurpose =
  | "command"
  | "entity-search"
  | "short-response"
  | "dictation";
```

The `entity-search` purpose is for situations where Hear! expects:

```text
organization names
publication names
creator names
locations
categories
short search phrases
one-to-five-word entity queries
```

Examples:

```text
"Tynedale"
"Tynedale Talking Magazine"
"Herne Bay"
"RNIB"
"York Talking News"
```

---

# 2N. Android `web_search` Model

Android provides:

```text
RecognizerIntent.LANGUAGE_MODEL_WEB_SEARCH
```

with the value:

```text
"web_search"
```

It is a language model based on web-search terms.

For Hear!'s `entity-search` profile use:

```ts
{
  lang: "en-GB",
  interimResults: true,
  maxAlternatives: 5,
  continuous: false,
  requiresOnDeviceRecognition: false,
  addsPunctuation: false,
  contextualStrings,

  androidIntentOptions: {
    EXTRA_LANGUAGE_MODEL: "web_search",

    // Only add this on Android API >= 33.
    EXTRA_MASK_OFFENSIVE_WORDS: true,
  },
}
```

This profile is specifically intended to improve recognition when the expected utterance looks more like:

```text
a search query
a proper name
a short phrase
a single word
a few keywords
```

The Expo speech-recognition documentation specifically recommends the Android `web_search` language model for improving single-word prompts.

---

# 2O. Do Not Use `web_search` Blindly for Every Android Utterance

Hear! supports natural phrases such as:

```text
"play me the latest publication from Tynedale Talking Magazine"
"find me something local from Herne Bay"
"play the newest publication from the organization I listened to yesterday"
```

These are not merely search-term fragments.

Therefore use:

```text
NORMAL NATURAL CONTENT REQUEST
  -> Android free_form

ENTITY/KEYWORD SEARCH MODE
  -> Android web_search

SHORT CONFIRMATION / AMBIGUITY
  -> Android web_search
```

Do not permanently change all Android recognition to:

```text
web_search
```

without measured evidence.

---

# 2P. iOS Search Equivalent

iOS does not use Android's `LANGUAGE_MODEL_WEB_SEARCH`.

Use:

```ts
iosTaskHint: "search"
```

Apple defines the `search` task hint for speech used to specify search terms.

For Hear! entity/name search:

```ts
{
  lang: "en-GB",
  interimResults: true,
  maxAlternatives: 5,
  continuous: false,
  requiresOnDeviceRecognition: false,
  addsPunctuation: false,
  contextualStrings,

  iosTaskHint: "search",

  iosCategory: {
    category: "playAndRecord",
    categoryOptions: [
      "defaultToSpeaker",
      "allowBluetooth",
    ],
    mode: "measurement",
  },

  iosVoiceProcessingEnabled: false,
}
```

For short yes/no style interactions continue to use:

```ts
iosTaskHint: "confirmation"
```

---

# 2Q. Profile Selection Before Recognition

Because the speech engine profile must be chosen before the user speaks, Hear! cannot inspect the transcript and then retroactively choose `web_search`.

The profile must come from interaction state.

Examples:

```text
Global voice invocation from Home
  -> command profile
  -> Android free_form
  -> iOS search

Search-by-name input
  -> entity-search profile
  -> Android web_search
  -> iOS search

Ambiguity selection
  -> short-response profile
  -> Android web_search
  -> iOS confirmation

Feedback yes/no
  -> short-response profile
  -> Android web_search
  -> iOS confirmation
```

Add to the screen capability:

```ts
type VoiceRecognitionExpectation =
  | "natural-command"
  | "entity-search"
  | "short-response";
```

A screen/pending interaction may provide:

```ts
recognitionExpectation: "entity-search"
```

but it must not contain catalog-specific recognition code.

---

# 2R. Search-Term Dictionary Bias

For the `entity-search` profile, contextual strings become even more important.

SQLite should rank bias terms toward names likely to be spoken.

Recommended selection:

```text
active entity                +100
current ambiguity candidate   +95
visible entity                +90
active organization           +85
active publication            +85
active creator                +80
recently searched entity      +65
recently played entity        +55
screen-relevant location      +45
screen-relevant popular term  +20
```

For entity search prefer compact dictionary entries:

```text
Tynedale
Tynedale Talking Magazine
Herne Bay
RNIB
```

rather than large natural-language sentences.

Use:

```text
20-50 relevant terms
```

and deduplicate by normalized value.

---

# 2S. Search-Term N-Best Resolution

The search profile must still keep:

```ts
maxAlternatives: 5
```

Example:

```text
H1: tinder
H2: tyne dale
H3: tynedale
H4: time dale
H5: tindale
```

All alternatives enter the shared resolver:

```text
N-best ASR hypotheses
      |
      v
SQLite exact aliases
      +
FTS5
      +
trigram
      +
Double Metaphone
      +
validated ASR aliases
      +
contextual weighting
      |
      v
canonical entity
```

Do not rely on `web_search` as the final correction layer.

It improves the native transcript.

SQLite still owns Hear! entity understanding.

---

# 2T. Low-Confidence Retry Policy

If the first natural-command recognition returns:

```text
no useful transcript
OR
resolver = unresolved
OR
all candidate scores below threshold
```

do **not** silently rerun recognition and pretend the user said something else.

Instead, when the product flow permits, ask:

```text
"I didn't catch the name. Please say the organization or publication name again."
```

The retry can deliberately use:

```text
recognitionExpectation = "entity-search"
```

which means:

```text
Android -> web_search
iOS     -> search
```

This gives Hear! a second, more constrained recognition pass.

Example:

```text
Attempt 1:
"play me the newest thing from tinder talking magazine"

free_form
  -> unresolved / low confidence

Hear!:
"Please say the organization or publication name."

Attempt 2:
"Tynedale Talking Magazine"

Android web_search
or
iOS search
  +
contextualStrings
  +
SQLite resolver
```

This is preferable to guessing.

---

# 2U. Web-Search A/B Accuracy Tests

Do not assume `web_search` is better for every Hear! utterance.

Benchmark:

```text
Android free_form
vs
Android web_search
```

using the same UK-English entity corpus.

Test groups:

```text
single-word organization names
two-word locations
multiword publication names
acronyms
short creator names
long natural commands
slow speakers
regional UK accents
background noise
Bluetooth microphones
```

Measure:

```text
top-1 transcript accuracy
top-5 hypothesis recall
canonical entity top-1 accuracy
wrong auto-resolution rate
no-result rate
latency
```

Expected policy:

```text
web_search wins for short/name-heavy phrases
free_form wins or remains safer for natural sentences
```

but the actual shipping thresholds must come from Hear! measurements.

---

# 2V. Final Recognition Purpose Matrix

| Hear! interaction | Android | iOS | Locale |
|---|---|---|---|
| Normal natural command | `free_form` | `search` | `en-GB` |
| Search by organization/publication/creator/location | `web_search` | `search` | `en-GB` |
| Ambiguity short choice | `web_search` | `confirmation` | `en-GB` |
| Feedback yes/no | `web_search` | `confirmation` | `en-GB` |
| Future dictation/free text | `free_form` | `dictation` | `en-GB` |

The locale remains:

```text
en-GB
```

for all current Hear! profiles.



# 2W. Permissions Do Not Directly Increase Recognition Accuracy

Permissions themselves do not make the acoustic/language model smarter.

They enable Hear! to use the recognition path that gives the best available accuracy.

Correct model:

```text
permission
   |
   v
native recognizer becomes available
   |
   v
en-GB + correct recognition profile
   |
   v
contextual vocabulary + N-best hypotheses
   |
   v
SQLite correction/resolution
```

Therefore:

```text
REQUEST:
only permissions required by the selected recognition mode

DO NOT REQUEST:
unrelated permissions "just in case"
```

Extra permissions do not improve accuracy and create unnecessary accessibility/privacy friction.

---

# 2X. Android Permission Policy

Android speech recognition requires microphone access.

The native permission is:

```text
android.permission.RECORD_AUDIO
```

`expo-speech-recognition` exposes:

```ts
ExpoSpeechRecognitionModule.getMicrophonePermissionsAsync()
ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync()
```

Recommended Android flow:

```ts
const permission =
  await ExpoSpeechRecognitionModule.getMicrophonePermissionsAsync();

if (!permission.granted) {
  const requested =
    await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();

  if (!requested.granted) {
    // Voice recognition cannot start.
  }
}
```

Android does **not** have a separate runtime Speech Recognition permission equivalent to iOS.

For Hear!'s Android voice flow:

```text
required runtime permission:
RECORD_AUDIO
```

The Android `en-GB` language-model download is system managed. Do not invent an additional "language pack permission".

---

# 2Y. Android Expo Config Plugin

Configure the plugin in `app.json` / `app.config.ts`.

Recommended:

```json
{
  "expo": {
    "plugins": [
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
    ]
  }
}
```

Important:

```text
microphonePermission
```

is user-facing permission copy.

The Android speech-service package list is for package visibility/discovery. It is not a runtime permission.

Do not assume both Google packages exist on every device.

At runtime, inspect installed recognizers and choose an available one.

---

# 2Z. Android Permission Timing

Do not request microphone permission immediately when the app launches.

Preferred:

```text
user enters voice setup
or
user deliberately invokes voice for the first time
       |
       v
Hear! explains why microphone access is needed
       |
       v
wait for Hear! speech/TTS to finish
       |
       v
request Android microphone permission
       |
       v
permission result
```

Because Hear! is accessibility-focused:

```text
do not speak while the Android permission dialog is active
do not open microphone recognition while permission speech is still playing
do not send "Speak now" until the permission dialog is finished
```

---

# 2AA. Android Denied Permission

If:

```text
permission.granted = false
```

do not repeatedly reopen the system dialog.

Check:

```text
canAskAgain
```

Policy:

```text
canAskAgain = true
 -> explain once
 -> allow explicit retry

canAskAgain = false
 -> provide accessible Settings guidance
 -> do not keep requesting automatically
```

Local non-voice gestures and TalkBack navigation must remain fully usable.

---

# 2AB. Android Speech-Service Discovery

Permission granted does not guarantee a usable recognizer.

After permission:

```ts
const available =
  ExpoSpeechRecognitionModule.isRecognitionAvailable();

const services =
  ExpoSpeechRecognitionModule.getSpeechRecognitionServices();

const defaultService =
  ExpoSpeechRecognitionModule.getDefaultRecognitionService();
```

Then select the recognition service.

The intended policy remains:

```text
available supported Google service
      |
      v
prefer it according to measured device policy

otherwise
      |
      v
Android default recognizer
```

Do not hard-fail if a Google package is missing.

---

# 2AC. Android Bluetooth / Audio-Route Permissions

Do not request Bluetooth permissions merely because users may use Bluetooth headsets.

Normal system audio routing should remain system-owned.

Only request additional Android Bluetooth permissions if Hear! later explicitly:

```text
enumerates nearby Bluetooth devices
connects/disconnects devices itself
or manages Bluetooth device metadata/routes
```

If that feature is added on Android 12+, review:

```text
BLUETOOTH_CONNECT
BLUETOOTH_SCAN
```

according to the exact feature.

These permissions are **not part of the current ASR accuracy requirement**.

The recognizer should use the active system microphone/audio route.

---

# 2AD. iOS Permission Policy

iOS has two distinct permission concepts.

## Microphone

Required whenever Hear! records the user's voice.

Native privacy key:

```text
NSMicrophoneUsageDescription
```

Expo method:

```ts
ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync()
```

## Apple Speech Recognition

For network-backed `SFSpeechRecognizer` recognition, request:

```text
SFSpeechRecognizer.requestAuthorization()
```

Native privacy key:

```text
NSSpeechRecognitionUsageDescription
```

Expo method:

```ts
ExpoSpeechRecognitionModule.requestSpeechRecognizerPermissionsAsync()
```

For the normal connected Hear! profile:

```ts
requiresOnDeviceRecognition: false
```

request:

```text
microphone permission
+
speech-recognition permission
```

---

# 2AE. iOS Combined Permission Flow

For normal connected recognition, the Expo library also exposes:

```ts
ExpoSpeechRecognitionModule.requestPermissionsAsync()
```

which requests:

```text
AVAudioSession microphone permission
+
SFSpeechRecognizer authorization
```

However, Hear! should prefer explicit capability-aware permission code so the app does not request Apple Speech authorization when the selected mode is guaranteed on-device.

Conceptual:

```ts
async function ensureIosSpeechPermissions(
  requiresOnDeviceRecognition: boolean,
) {
  const mic =
    await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();

  if (!mic.granted) {
    return { ok: false, reason: "microphone-denied" };
  }

  if (!requiresOnDeviceRecognition) {
    const speech =
      await ExpoSpeechRecognitionModule.requestSpeechRecognizerPermissionsAsync();

    if (!speech.granted) {
      return {
        ok: false,
        reason: speech.restricted
          ? "speech-restricted"
          : "speech-denied",
      };
    }
  }

  return { ok: true };
}
```

---

# 2AF. iOS On-Device Permission Optimization

The current `expo-speech-recognition` documentation states that when iOS is deliberately using on-device recognition, only microphone permission is required.

Therefore:

```text
iOS
+
requiresOnDeviceRecognition = true
+
on-device recognition supported
```

can use:

```text
microphone permission
```

without requesting the network Speech Recognition authorization.

This can reduce permission friction.

But this must not be used as a trick to force on-device mode if network recognition is measurably more accurate for Hear!.

Recognition mode is still chosen by capability and benchmark policy.

---

# 2AG. iOS Permission Fallback

If Apple Speech Recognition permission is:

```text
denied
or
restricted
```

do not immediately disable Hear! voice.

Check:

```text
on-device recognition supported?
```

If yes:

```text
microphone granted
      |
      v
switch to explicit on-device en-GB profile
      |
      v
requiresOnDeviceRecognition = true
```

If on-device recognition is unavailable:

```text
voice semantic recognition unavailable
```

and Hear! should provide an accessible permission/settings explanation.

Do not silently switch the language away from:

```text
en-GB
```

---

# 2AH. iOS Restricted State

The Expo permission result can contain:

```text
restricted = true
```

This can occur due to device policy such as:

```text
Screen Time / Content & Privacy Restrictions
Mobile Device Management
```

Treat this differently from a normal user denial.

Example state:

```ts
type SpeechPermissionFailure =
  | "microphone-denied"
  | "speech-denied"
  | "speech-restricted";
```

For `speech-restricted`:

```text
do not keep prompting
explain that the device is restricting Speech Recognition
offer accessible Settings/help instructions
try on-device recognition if supported
```

---

# 2AI. iOS Info.plist Permission Copy

Through the Expo config plugin, use clear accessible descriptions.

Recommended:

```json
{
  "microphonePermission": "Hear! uses the microphone so you can control the app and find audio using your voice.",
  "speechRecognitionPermission": "Hear! uses Apple speech recognition to understand your voice commands."
}
```

These generate the iOS usage-description values required by native APIs.

The native keys are:

```text
NSMicrophoneUsageDescription
NSSpeechRecognitionUsageDescription
```

The permission text must state what Hear! actually does.

Do not use vague text such as:

```text
"Microphone needed."
```

---

# 2AJ. Permission State Model

Create a typed capability state.

```ts
type VoicePermissionState = {
  microphone:
    | "unknown"
    | "granted"
    | "denied";

  speechRecognition:
    | "not-required"
    | "unknown"
    | "granted"
    | "denied"
    | "restricted";

  canAskMicrophoneAgain?: boolean;
  canAskSpeechAgain?: boolean;
};
```

Keep this separate from:

```text
voice session state
speech model state
resolver state
```

Do not overload one global store with unrelated concerns.

---

# 2AK. Permission Gate Before Native Recognition

The only supported order is:

```text
VOICE INVOCATION
      |
      v
CAPABILITY CHECK
      |
      v
PERMISSION CHECK
      |
      +--> permission explanation if needed
      |
      v
PERMISSION RESOLVED
      |
      v
MODEL / SERVICE CHECK
      |
      v
BUILD RECOGNITION PROFILE
      |
      v
OPEN MICROPHONE
      |
      v
NATIVE READY
      |
      v
"SPEAK NOW"
      |
      v
8-SECOND PRE-SPEECH WINDOW
```

Never call:

```ts
ExpoSpeechRecognitionModule.start(...)
```

while permission state is unresolved.

---

# 2AL. Permissions and the 8-Second Timer

The 8-second timer must not include:

```text
permission explanation
permission dialog
language model download dialog
recognizer service discovery
audio-session setup
```

The timer starts only after:

```text
native recognizer ready/start
```

Therefore:

```text
user spends 15 seconds reading/listening to a permission prompt
```

does not consume their 8 seconds.

---

# 2AM. Accessibility Permission UX

For TalkBack / VoiceOver:

```text
1. Hear! explains what permission is about to appear.
2. Wait for app TTS/announcement completion.
3. Open native permission UI.
4. Hear! stays silent while native permission UI has focus.
5. On return, inspect actual permission state.
6. Do not assume granted merely because the dialog closed.
7. Continue only after native state confirms it.
```

Do not use repeated accessibility announcements that fight with the system permission dialog.

---

# 2AN. Internal Documentation Layout

Keep implementation documentation inside the repository.

Recommended structure:

```text
docs/
  voice/
    README.md
    architecture.md
    permissions.md
    recognition-profiles.md
    uk-english-accuracy.md
    android-language-model.md
    ios-speech-recognition.md
    dictionary-and-contextual-strings.md
    transcript-filtering.md
    sqlite-resolver.md
    ambiguity.md
    feedback.md
    accessibility.md
    diagnostics.md
    testing.md
```

## `docs/voice/README.md`

Index all voice documentation.

Include:

```text
architecture overview
supported platforms
main state machine
links to every detailed document
```

## `docs/voice/permissions.md`

Put:

```text
Android RECORD_AUDIO
iOS microphone permission
iOS Speech Recognition permission
denied/restricted behavior
Settings recovery
accessibility permission UX
```

## `docs/voice/recognition-profiles.md`

Put exact:

```text
Android free_form profile
Android web_search profile
iOS search profile
iOS confirmation profile
en-GB invariant
on-device/network selection
```

## `docs/voice/android-language-model.md`

Put:

```text
Android 13+ en-GB model inspection
download trigger
opened_dialog
download_success
download_scheduled
AppState re-check
fallback behavior
```

## `docs/voice/dictionary-and-contextual-strings.md`

Put:

```text
local command dictionary
safe filler dictionary
SQLite entity vocabulary
contextualStrings ranking
validated ASR aliases
```

## `docs/voice/testing.md`

Put the shared Android/iOS UK-English accuracy corpus and acceptance benchmarks.

---

# 2AO. Source-Code Documentation Locations

Keep short code-level comments near platform-specific behavior.

Recommended:

```text
src/services/voice/speech-recognition-bootstrap.ts
  -> capability + permission lifecycle comments

src/services/voice/speech-model-manager.ts
  -> Android model-management notes

src/services/voice/recognition-profile.ts
  -> exact option rationale and platform guards

src/services/voice/recognition-dictionary.ts
  -> dictionary ownership rules

src/services/voice/transcript-preparation.ts
  -> filtering order / non-destructive rules

src/services/voice/voice-session-engine.ts
  -> 8-second timer invariant

src/services/voice/resolver.ts
  -> orchestration only; link to docs/voice/sqlite-resolver.md
```

Do not put multi-page explanations into source-code comments.

Source comments should reference the appropriate:

```text
docs/voice/*.md
```

document.

---

# 2AP. Official Documentation References

The repository documentation should include an "Official References" section.

Use these sources:

## Expo Speech Recognition

```text
https://github.com/jamsch/expo-speech-recognition
```

Use for:

```text
installation
config plugin
permission methods
contextualStrings
androidIntentOptions
iosTaskHint
iosCategory
on-device recognition
language-model download
```

## Android SpeechRecognizer

```text
https://developer.android.com/reference/android/speech/SpeechRecognizer
```

Use for:

```text
RECORD_AUDIO requirement
native recognizer lifecycle
on-device recognizer APIs
service behavior
```

## Android RecognizerIntent

```text
https://developer.android.com/reference/android/speech/RecognizerIntent
```

Use for:

```text
LANGUAGE_MODEL_FREE_FORM
LANGUAGE_MODEL_WEB_SEARCH
EXTRA_MASK_OFFENSIVE_WORDS
biasing strings
silence extras
language configuration
```

## Android RECORD_AUDIO Permission

```text
https://developer.android.com/reference/android/Manifest.permission#RECORD_AUDIO
```

## Apple Speech Recognition Permission

```text
https://developer.apple.com/documentation/speech/asking-permission-to-use-speech-recognition
```

Use for:

```text
NSSpeechRecognitionUsageDescription
SFSpeechRecognizer authorization
network speech-recognition privacy
```

## Apple Microphone Usage Description

```text
https://developer.apple.com/documentation/bundleresources/information-property-list/nsmicrophoneusagedescription
```

## Apple SFSpeechRecognizer

```text
https://developer.apple.com/documentation/speech/sfspeechrecognizer
```

Use for:

```text
availability
authorization state
on-device support
locale-specific recognizer behavior
```

## Apple Contextual Strings

```text
https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/contextualstrings
```

## Apple Speech Task Hints

```text
https://developer.apple.com/documentation/speech/sfspeechrecognitiontaskhint
```

## Apple AVAudioSession

```text
https://developer.apple.com/documentation/avfaudio/avaudiosession
```

Use for iOS microphone/playback session coordination.

---

# 2AQ. Documentation Maintenance Rule

Every platform-specific native option in production code must have one of:

```text
official Android documentation
official Apple documentation
expo-speech-recognition documentation
```

listed in the corresponding `docs/voice/*.md` file.

Do not copy native options from forum posts into production without verifying them against official/native or library documentation.

For example:

```text
EXTRA_DICTATION_MODE
```

must not appear merely because an unofficial article suggested it.

This rule prevents unsupported Android/iOS options from accumulating in the voice stack.

---

# 2AR. Permissions Definition of Done

- [ ] Android requests `RECORD_AUDIO` through the Expo speech-recognition microphone permission API.
- [ ] Android does not request a fake separate Speech Recognition runtime permission.
- [ ] Android model download does not invent an extra runtime permission.
- [ ] iOS always has `NSMicrophoneUsageDescription`.
- [ ] iOS network recognition has `NSSpeechRecognitionUsageDescription`.
- [ ] Normal connected iOS recognition checks microphone + Speech Recognition permission.
- [ ] Explicit on-device iOS recognition can use microphone-only permission when supported by the selected library behavior.
- [ ] iOS handles `restricted` separately from `denied`.
- [ ] iOS can attempt on-device fallback when Speech Recognition authorization is denied/restricted and on-device support exists.
- [ ] Permission dialogs never consume the 8-second pre-speech timeout.
- [ ] Hear! TTS does not compete with native permission dialogs.
- [ ] `canAskAgain` prevents permission-dialog loops.
- [ ] TalkBack and VoiceOver permission flows are tested.
- [ ] Recognition service availability is checked after permission.
- [ ] Internal voice documentation lives under `docs/voice/`.
- [ ] Official native/library references are included in the repository docs.

# 3. New Voice Modules

Add or finalize:

```text
src/services/voice/
  speech-recognition-bootstrap.ts
  speech-model-manager.ts
  recognition-profile.ts
  asr-hypotheses.ts
  transcript-preparation.ts
  recognition-dictionary.ts
```

Update:

```text
src/services/voice/
  voice-session-engine.ts
  local-command-router.ts
  resolver.ts
  repository.ts
  normalize.ts
  diagnostics.ts
  events.ts
  speech-coordinator.ts
```

Optional store:

```text
src/stores/
  speech-capability-store.ts
```

---

# 4. Common Cross-Platform Recognition Options

These options are shared by Android and iOS.

Use this as the base Hear! command profile:

```ts
const commonHearCommandOptions = {
  lang: "en-GB",

  // Needed for detecting progress/activity.
  // Never execute a command from a partial result.
  interimResults: true,

  // Keep alternative hypotheses for SQLite recovery.
  maxAlternatives: 5,

  // One voice invocation = one command.
  continuous: false,

  // Connected/default profile should not REQUIRE offline recognition.
  requiresOnDeviceRecognition: false,

  // Commands do not need punctuation for resolver matching.
  addsPunctuation: false,

  // Generated dynamically from SQLite/current interaction context.
  contextualStrings,
};
```

## Values to pass

```text
lang                         = "en-GB"
interimResults               = true
maxAlternatives              = 5
continuous                   = false
requiresOnDeviceRecognition  = false
addsPunctuation              = false
contextualStrings            = dynamic, 20-50 useful phrases
```

These are the default values for normal Hear! voice commands.

---

# 5. Android Production Profile

Recommended normal Android profile:

```ts
const androidHearCommandOptions = {
  ...commonHearCommandOptions,

  androidIntentOptions: {
    EXTRA_LANGUAGE_MODEL: "free_form",

    // Android 13+: explicitly request native offensive-word masking.
    EXTRA_MASK_OFFENSIVE_WORDS: true,
  },
};
```

## Exact Android values

```text
EXTRA_LANGUAGE_MODEL       = "free_form"
EXTRA_MASK_OFFENSIVE_WORDS = true   // Android 13+
```

Do not duplicate these options through `androidIntentOptions`:

```text
EXTRA_LANGUAGE
EXTRA_MAX_RESULTS
EXTRA_PARTIAL_RESULTS
```

because the top-level options already control them:

```text
lang            -> language
maxAlternatives -> number of results
interimResults  -> partial results
```

---

# 6. Android Options We Do NOT Pass by Default

Do not put these into the standard Hear! command profile:

```text
EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE
EXTRA_DICTATION_MODE
```

Do not use:

```text
EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS = 8000
```

to implement the Hear! 8-second timeout.

Our 8 seconds means:

```text
TIME TO BEGIN SPEAKING
```

not:

```text
POST-SPEECH SILENCE
```

Android's silence extras are endpointing hints and recognizers may ignore them.

The Hear! timeout belongs in `voice-session-engine.ts`.

---

# 7. Optional Android Endpointing Profile

If real-device testing shows a specific recognizer leaves the microphone open too long after speech, we may test bounded endpointing hints.

These must be feature-flagged and measured per device/recognizer.

Example experimental values:

```ts
androidIntentOptions: {
  EXTRA_LANGUAGE_MODEL: "free_form",

  EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1200,

  EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1800,

  EXTRA_MASK_OFFENSIVE_WORDS: false,
}
```

Do **not** make these values foundational to the lifecycle.

The app must still function correctly if Android ignores them.

Recommended default:

```text
do not pass silence extras
```

until device tests justify them.

---

# 8. Android Short-Response Profile

Hear! has short follow-up interactions:

```text
yes
no
one
two
left
right
next
previous
select
cancel
```

For these short-response states, Android may use a separate profile:

```ts
const androidShortResponseOptions = {
  ...commonHearCommandOptions,

  maxAlternatives: 5,

  androidIntentOptions: {
    EXTRA_LANGUAGE_MODEL: "web_search",

    // Android 13+: mask offensive terms in native recognition output.
    EXTRA_MASK_OFFENSIVE_WORDS: true,
  },
};
```

Use this only when the interaction controller knows the expected response is short.

Examples:

```text
ambiguity selection
feedback confirmation
yes/no confirmation
short accessibility command
```

Do not use `web_search` for normal long natural Hear! requests such as:

```text
"play me the latest publication from Tynedale Talking Magazine"
```

Normal requests use:

```text
free_form
```

---

# 9. Android Recognition-Service Selection

Do not blindly force a package that may not exist.

Bootstrap should inspect:

```ts
ExpoSpeechRecognitionModule.isRecognitionAvailable();

ExpoSpeechRecognitionModule.getSpeechRecognitionServices();

ExpoSpeechRecognitionModule.getDefaultRecognitionService();

ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
```

Policy:

```text
1. If a supported Google recognition service is installed, prefer it.
2. If not, use the Android default recognizer.
3. If on-device recognition is explicitly requested, use the platform on-device recognizer.
4. Never fail just because a particular Google package is absent.
```

Recognized packages may include, depending on device:

```text
com.google.android.googlequicksearchbox
com.google.android.as
```

Treat installed-services discovery as authoritative.

---

# 10. Android en-GB Offline Model Download

## Android 13+

Check installed/supported locales:

```ts
const support =
  await ExpoSpeechRecognitionModule.getSupportedLocales({
    androidRecognitionServicePackage: selectedPackage,
  });
```

If:

```text
en-GB supported
AND
en-GB not installed
```

call:

```ts
const result =
  await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
    locale: "en-GB",
  });
```

Handle:

```text
opened_dialog
download_success
download_scheduled
```

## `opened_dialog`

Typically Android 13.

Flow:

```text
announce accessible setup message
        |
wait for speech completion
        |
trigger Android model download
        |
system dialog opens
        |
app may background/inactivate
        |
user returns
        |
AppState = active
        |
re-check installedLocales
```

Do not interpret `opened_dialog` as installed.

## `download_success`

Re-check installed locales and confirm `en-GB`.

## `download_scheduled`

Store:

```text
download-scheduled
```

Do not repeatedly trigger the API.

Re-check on a later app foreground or explicit settings action.

---

# 11. Android Model State

Use:

```ts
type AndroidSpeechModelState =
  | "unknown"
  | "checking"
  | "missing"
  | "download-requested"
  | "download-scheduled"
  | "installed"
  | "unsupported"
  | "error";
```

Do not mix this state with:

```text
idle
listening
speech-active
routing
ambiguity
```

Model state is device capability state.

Voice session state is interaction state.

---

# 12. Android Fallback

The UK language model must improve offline/on-device capability but must not become a hard blocker.

If the model is unavailable:

```text
continue with default/network recognizer
```

Therefore normal connected mode uses:

```ts
requiresOnDeviceRecognition: false
```

Offline mode may use:

```ts
requiresOnDeviceRecognition: true
```

only when:

```text
on-device recognition supported
AND
en-GB model confirmed installed
```

---

# 13. iOS Production Profile

Recommended normal iOS Hear! profile:

```ts
const iosHearCommandOptions = {
  ...commonHearCommandOptions,

  // Hear! commands usually describe what content to find/play.
  iosTaskHint: "search",

  iosCategory: {
    category: "playAndRecord",
    categoryOptions: [
      "defaultToSpeaker",
      "allowBluetooth",
    ],
    mode: "measurement",
  },

  // Start false; enable only if device tests show speaker feedback problems.
  iosVoiceProcessingEnabled: false,
};
```

## Exact iOS values

```text
iosTaskHint = "search"

iosCategory.category = "playAndRecord"

iosCategory.categoryOptions =
  ["defaultToSpeaker", "allowBluetooth"]

iosCategory.mode = "measurement"

iosVoiceProcessingEnabled = false
```

The speech library itself uses the Apple speech recognizer and applies `contextualStrings`, `requiresOnDeviceRecognition`, and `iosTaskHint` to the native speech request.

---

# 14. iOS Short-Response Profile

Apple provides a specific task hint for short confirmation commands.

For:

```text
yes
no
maybe
one
two
select
confirm
cancel
```

use:

```ts
const iosShortResponseOptions = {
  ...commonHearCommandOptions,

  iosTaskHint: "confirmation",

  iosCategory: {
    category: "playAndRecord",
    categoryOptions: [
      "defaultToSpeaker",
      "allowBluetooth",
    ],
    mode: "measurement",
  },

  iosVoiceProcessingEnabled: false,
};
```

Use this in:

```text
ambiguity confirmation
feedback confirmation
yes/no prompts
single-word choice flows
```

---

# 15. iOS Task-Hint Selection

Use profile by interaction state:

```text
normal content request
  -> iosTaskHint = "search"

ambiguity/feedback/confirmation
  -> iosTaskHint = "confirmation"

future long free-text dictation
  -> iosTaskHint = "dictation"

other/general use
  -> iosTaskHint = "unspecified"
```

Do not use one task hint blindly for every flow.

---

# 16. iOS On-Device Recognition

Check whether iOS supports on-device recognition.

If supported and product policy chooses offline mode:

```ts
requiresOnDeviceRecognition: true
```

If unsupported:

```ts
requiresOnDeviceRecognition: false
```

and allow Apple's normal network-backed recognition.

Important:

```text
Hear! cannot currently trigger an iOS speech-model download through
expo-speech-recognition the way it can on Android.
```

Therefore do not create a fake:

```text
Download English UK model
```

button on iOS unless the app adds a separate native Apple asset-management implementation in the future.

For the current Expo architecture:

```text
Android -> download/control flow
iOS     -> support detection + fallback
```

---

# 17. iOS Permissions

Connected/network speech recognition may require Apple's Speech Recognition permission in addition to microphone permission.

The permission flow must be handled before normal recognition.

Do not speak over the iOS system permission UI.

Recommended:

```text
explain
  |
wait for Hear! speech completion
  |
request permission
  |
wait for system result
  |
continue
```

If using on-device recognition in a supported configuration, permission requirements may differ; keep capability/permission handling inside the bootstrap module, not screen components.

---

# 18. iOS Audio Session

Hear! is a media app, so speech recognition must coordinate with current playback/TTS.

Before starting recognition:

```text
1. SpeechCoordinator quiets app TTS.
2. Pause/duck content according to product policy.
3. Save relevant audio-session state if required.
4. Start recognition with Hear!'s iOS audio category.
```

After recognition:

```text
1. End/deactivate recognition session.
2. Restore app playback/audio session safely.
3. Speak/execute the result.
```

Do not allow the Player and speech recognizer to fight over the iOS audio session.

---

# 19. iOS Voice Processing

`iosVoiceProcessingEnabled` may help microphone feedback in some speaker-output scenarios.

But it can change the audio session mode and affect playback volume.

Default:

```ts
iosVoiceProcessingEnabled: false
```

Enable only behind a tested device/profile rule if Hear! hears its own speaker/TTS.

If enabled:

```ts
iosVoiceProcessingEnabled: true
```

test:

```text
iPhone speaker
Bluetooth headset
wired headset
VoiceOver
audio playback
TTS
```

before shipping.

---


# 19A. Cross-Platform Offensive-Word Filtering

Hear! should use **two layers**:

```text
Layer 1:
native Android masking where supported

Layer 2:
shared Hear! transcript profanity filtering on Android + iOS
```

Do not rely on native Android masking alone because:

```text
- it is Android 13+ only;
- recognizer implementations may behave differently;
- iOS has no equivalent exposed option in expo-speech-recognition;
- partial and alternative hypotheses still need consistent app policy.
```

## Android Native Setting

For Android 13+ pass:

```ts
androidIntentOptions: {
  EXTRA_LANGUAGE_MODEL: "free_form",
  EXTRA_MASK_OFFENSIVE_WORDS: true,
}
```

For short-response mode:

```ts
androidIntentOptions: {
  EXTRA_LANGUAGE_MODEL: "web_search",
  EXTRA_MASK_OFFENSIVE_WORDS: true,
}
```

`EXTRA_MASK_OFFENSIVE_WORDS` means:

```text
ask the recognizer to mask offensive words in recognition results
```

It does **not** guarantee that the term disappears completely.

The recognizer may return masked text such as:

```text
"play **** news"
```

rather than:

```text
"play news"
```

Therefore Hear! still needs its own sanitizer.

## Android API-Level Guard

`EXTRA_MASK_OFFENSIVE_WORDS` was added in Android API 33.

Only include that Android intent option when:

```text
Platform.OS === "android"
AND
Platform.Version >= 33
```

This is important because `expo-speech-recognition` resolves Android intent option names through native reflection.

Do not pass newer Android extras blindly to older Android versions.

Use:

```ts
const androidIntentOptions: Record<string, boolean | string | number> = {
  EXTRA_LANGUAGE_MODEL: purpose === "short-response"
    ? "web_search"
    : "free_form",
};

if (Platform.Version >= 33) {
  androidIntentOptions.EXTRA_MASK_OFFENSIVE_WORDS = true;
}
```

---

# 19B. Shared Hear! Profanity Filter

Add:

```text
src/services/voice/profanity-filter.ts
```

This module runs on **both Android and iOS**.

Suggested API:

```ts
export type ProfanityFilterMode =
  | "remove"
  | "mask";

export interface ProfanityFilterResult {
  original: string;
  sanitized: string;
  removedCount: number;
  matchedTerms: string[];
}

export interface ProfanityFilter {
  sanitize(
    text: string,
    mode?: ProfanityFilterMode,
  ): ProfanityFilterResult;
}
```

For Hear!'s command pipeline use:

```text
mode = remove
```

Example:

```text
input:
"please play [offensive word] tynedale talking magazine"

sanitized:
"please play tynedale talking magazine"
```

---

# 19C. Profanity Dictionary

Do not scatter offensive words across:

```text
resolver.ts
normalize.ts
local-command-router.ts
voice-session-engine.ts
```

Keep one versioned profanity dictionary.

Recommended:

```text
src/services/voice/dictionaries/
  profanity-en-GB.ts
```

or:

```text
assets/voice/profanity-en-GB.json
```

Structure:

```ts
export type ProfanityDictionaryEntry = {
  canonical: string;
  variants: string[];
  severity: "mild" | "strong";
};
```

Example structure only:

```ts
const PROFANITY_EN_GB: ProfanityDictionaryEntry[] = [
  {
    canonical: "<term>",
    variants: [
      "<variant-1>",
      "<variant-2>",
    ],
    severity: "strong",
  },
];
```

The production dictionary should include:

```text
British spellings
common contractions
common ASR spacing variants
common plural/inflected forms
```

Do not include catalog/entity names merely because they resemble a profanity term.

---

# 19D. Profanity Matching Rules

The filter must be token/phrase aware.

Do not do:

```ts
text.replaceAll("bad", "")
```

because that can corrupt innocent words and entity names.

Use:

```text
Unicode normalization
case folding
token boundaries
phrase boundaries
whole-word matching
controlled inflection matching
```

Bad:

```text
substring removal
```

Good:

```text
whole-token / validated phrase removal
```

Preserve word spacing after removal:

```text
"play   tynedale"
    ↓
"play tynedale"
```

---

# 19E. Raw vs Sanitized Transcript

Keep two in-memory forms:

```ts
type PreparedAsrHypothesis = {
  rawTranscript: string;
  sanitizedTranscript: string;
  confidence?: number;
  rank: number;
};
```

Pipeline:

```text
native ASR
   |
   v
rawTranscript
   |
   +--> profanity filter
   |
   v
sanitizedTranscript
   |
   v
filler removal
   |
   v
command / semantic parsing
```

For Hear!'s normal command-routing policy:

```text
local commands:
use sanitized transcript

semantic resolver:
use sanitized transcript
```

This satisfies the requirement that offensive terms are removed before command/entity resolution.

Do not write raw offensive transcripts to production telemetry.

If raw text must be retained temporarily for debugging in development:

```text
development build only
in-memory only
never persistent by default
```

---

# 19F. Entity-Safety Rule

Profanity filtering must not destroy legitimate Hear! catalog entities.

Before permanently deleting a matched word from a semantic query, apply this policy:

```text
1. exact whole-word profanity match?
2. is the token part of a known high-confidence entity phrase
   supplied by SQLite/current contextualStrings?
3. if YES:
      preserve it for entity matching
      but redact it from UI/logging if policy requires
4. if NO:
      remove it
```

This avoids damaging legitimate names.

Implement with:

```ts
sanitizeTranscript({
  text,
  protectedPhrases: contextualStrings,
});
```

The protected phrases come from SQLite, not hardcoded TypeScript.

---

# 19G. Recommended Hear! Profanity Policy

Use:

```text
Android native masking:
ON when API >= 33

Shared Hear! profanity filtering:
ON for Android + iOS

Resolver input:
sanitized transcript

TTS/UI:
sanitized or redacted text only

Telemetry:
never persist raw profanity by default

SQLite entity names:
protected from accidental destructive filtering
```

If a real catalog title legitimately contains an offensive term:

```text
allow entity resolution using protected phrase context
but keep UI/TTS handling aligned with product content policy
```

---

# 19H. Profanity Filtering Order

Correct order:

```text
ASR alternatives
      |
      v
native Android mask (Android 13+, if supported)
      |
      v
shared profanity sanitizer
      |
      v
safe filler removal
      |
      v
local command detection
      |
      v
semantic grammar parsing
      |
      v
SQLite entity resolver
```

Do not filter profanity after execution.

It must happen before:

```text
local command routing
semantic resolution
feedback free-text processing
diagnostic persistence
```

---

# 19I. Partial Results

Interim results are for:

```text
speech activity
UI transcript preview
timer/lifecycle awareness
```

Do not execute them.

If showing interim text in the UI:

```text
sanitize it first
```

Never flash an offensive term in the UI and only remove it on the final result.

Pipeline:

```text
partial transcript
 -> profanity sanitizer
 -> display sanitized partial
```

---

# 19J. ASR Alternatives

Sanitize all hypotheses independently.

Example:

```text
H1 raw -> sanitize -> H1 clean
H2 raw -> sanitize -> H2 clean
H3 raw -> sanitize -> H3 clean
```

Do not sanitize only the first/top hypothesis.

Then pass clean hypotheses into the multi-hypothesis SQLite resolver.

---

# 19K. Feedback Flow

If voice feedback allows free-form speech:

```text
ASR
 -> profanity sanitizer
 -> feedback parser/storage
```

Do not store offensive raw transcript by default.

If feedback is structured:

```text
yes/no
rating
positive/negative
```

the short-response recognition profile applies and profanity filtering still runs as a safety layer.

---

# 19L. Tests for Offensive-Word Filtering

## Android 13+

```text
EXTRA_MASK_OFFENSIVE_WORDS = true
```

must be present.

## Android 12-

The option must **not** be passed.

## iOS

Shared profanity sanitizer must still remove offensive tokens.

## Partial transcript

Offensive term is removed/masked before display.

## Alternative hypotheses

All alternatives are sanitized independently.

## Entity protection

A legitimate SQLite entity phrase containing a protected term must not be broken by the generic filter.

## Spacing

Removal does not produce malformed text.

Example:

```text
"play [removed] tynedale"
    ↓
"play tynedale"
```

## Telemetry

Production diagnostics never persist the unsanitized transcript.


# 20. Recognition Dictionary Architecture

The "dictionary" must not be one giant hardcoded JavaScript map.

Use four layers.

```text
Dictionary Layer 1:
Generic app commands

Dictionary Layer 2:
Safe filler/conversational phrases

Dictionary Layer 3:
Dynamic Hear! entity vocabulary from SQLite

Dictionary Layer 4:
Validated ASR aliases in SQLite
```

---

# 21. Dictionary Layer 1 — Generic Command Dictionary

This can live in code/config because it describes app behavior, not catalog data.

Example:

```ts
export const LOCAL_COMMAND_DICTIONARY = {
  PAUSE: [
    "pause",
    "pause this",
    "pause playback",
  ],

  RESUME: [
    "resume",
    "continue",
    "carry on",
    "keep playing",
  ],

  STOP: [
    "stop",
    "stop playing",
  ],

  NEXT: [
    "next",
    "next track",
    "skip",
  ],

  PREVIOUS: [
    "previous",
    "previous track",
    "go back a track",
  ],

  HOME: [
    "home",
    "go home",
    "take me home",
  ],

  BACK: [
    "back",
    "go back",
  ],

  READ_SCREEN: [
    "read screen",
    "read this screen",
    "what is on this screen",
  ],

  CANCEL: [
    "cancel",
    "never mind",
    "forget it",
  ],

  HELP: [
    "help",
    "what can I say",
    "voice help",
  ],

  SELECT_NEXT: [
    "right",
    "next option",
  ],

  SELECT_PREVIOUS: [
    "left",
    "previous option",
  ],

  SELECT: [
    "select",
    "choose this",
    "choose it",
  ],
};
```

These phrases map to canonical local actions.

Do not create separate actions for each synonym.

---

# 22. Dictionary Layer 2 — Filler Dictionary

Safe filler/conversational phrases may live in code/config.

Example:

```ts
export const SAFE_FILLER_PHRASES = [
  "um",
  "umm",
  "uh",
  "uhh",
  "erm",
  "hmm",
  "ah",

  "okay",
  "ok",

  "please",
  "please can you",
  "can you",
  "could you",
  "would you",

  "I mean",
  "you know",
  "actually",
  "basically",

  "for me please",
];
```

Rules:

```text
- operate on token/phrase boundaries
- never substring-replace arbitrary letters
- only remove filler when it is outside a candidate entity span
- if uncertain, preserve it
```

Bad:

```ts
text.replace("er", "")
```

This can destroy real entity names.

---

# 23. Generic Semantic Grammar Dictionary

Generic Hear! content command language may also live in code/config or be generated from the Alexa interaction contract.

Examples:

```ts
export const SEMANTIC_COMMAND_PHRASES = [
  "play",
  "play me",
  "find",
  "find me",
  "search",
  "search for",
  "look for",
  "give me",
  "let me hear",
  "I want to hear",
  "I would like to hear",
  "put on",
  "recommend",
  "recommend me",
];
```

Modifiers:

```ts
export const SEMANTIC_MODIFIERS = {
  latest: [
    "latest",
    "most recent",
    "newest",
    "recent",
  ],

  local: [
    "local",
    "near me",
    "nearby",
    "my area",
    "my town",
    "my city",
  ],

  recommended: [
    "recommended",
    "for me",
    "something I might like",
  ],

  publication: [
    "publication",
    "publications",
  ],
};
```

Relationships:

```text
from
by
in
about
near
```

These are parsed into semantic structure rather than deleted blindly.

---

# 24. Dictionary Layer 3 — SQLite Entity Dictionary

Catalog vocabulary must come from SQLite.

Examples:

```text
organization names
publication names
creator names
categories
tags
locations
canonical aliases
editorial aliases
```

Repository method:

```ts
getRecognitionBiasTerms(input: {
  screenId: string;
  activeEntityId?: string;
  visibleEntityIds?: string[];
  recentEntityIds?: string[];
  limit: number;
}): Promise<string[]>;
```

Use these terms as:

```ts
contextualStrings
```

on **both Android and iOS**.

This is the main native-recognition dictionary/bias mechanism.

---

# 25. Contextual String Budget

Do not send the whole database to Android or iOS.

Start with:

```text
20-50 contextual strings
```

selected by current screen state.

Priority:

```text
1. active entity
2. active publication
3. active organization
4. active creator
5. visible results
6. current ambiguity choices
7. recent entities
8. screen-relevant popular entities
```

Deduplicate case-insensitively.

Keep canonical phrases short.

---

# 26. Dictionary Layer 4 — Validated ASR Aliases

Real recognition errors belong in SQLite.

Example:

```text
canonical:
Tynedale Talking Magazine

observed ASR:
tinder talking magazine
tyne dale talking magazine
tindale talking magazine
```

After validation:

```text
voice_aliases

entity_id     = org_123
alias         = "tinder"
alias_source  = "validated-asr"
weight        = controlled confidence
```

This benefits both Android and iOS because the post-ASR resolver is shared.

Do not add:

```ts
if (text.includes("tinder")) return Tynedale;
```

to production TypeScript.

---

# 27. Cross-Platform Contextual Strings

Use the same dynamic dictionary generator for both platforms:

```ts
const contextualStrings =
  await voiceRepository.getRecognitionBiasTerms({
    screenId: screenSnapshot.screenId,
    activeEntityId: screenSnapshot.activeEntity?.id,
    visibleEntityIds: screenSnapshot.visibleEntityIds,
    limit: 40,
  });
```

Then:

```text
Android:
contextualStrings -> EXTRA_BIASING_STRINGS where supported

iOS:
contextualStrings -> SFSpeechRecognitionRequest.contextualStrings
```

This means SQLite improves recognition **before** transcription on both platforms.

---

# 28. Transcript Filtering Pipeline

For each ASR hypothesis:

```text
raw transcript
     |
     v
Unicode normalization
     |
     v
tokenize
     |
     v
safe filler detection
     |
     v
local command detection
     |
     v
semantic command/modifier parsing
     |
     v
relationship parsing
     |
     v
preserve candidate entity spans
     |
     v
SQLite resolver
```

Never globally delete:

```text
talking
magazine
newspaper
news
publication
```

because these may be part of real names.

Down-weight common catalog words using SQLite corpus statistics instead.

---

# 29. Common Catalog Token Weighting

Prefer a data-driven distinctiveness score.

Example:

```text
token document frequency
or
inverse document frequency
```

Then:

```text
Tynedale
  -> high distinctive weight

Talking
  -> lower weight

Magazine
  -> lower weight
```

This lets:

```text
"tinder talking magazine"
```

still retrieve:

```text
Tynedale Talking Magazine
```

without making every "Talking Magazine" entity equally strong.

---

# 30. ASR Hypotheses

Keep:

```ts
type AsrHypothesis = {
  transcript: string;
  confidence?: number;
  rank: number;
};
```

Use up to:

```text
5 hypotheses
```

Example:

```text
1. tinder talking magazine
2. tyne dale talking magazine
3. tynedale talking magazine
4. time dale talking magazine
5. tinder talking magazines
```

Prepare and resolve each hypothesis independently.

Merge evidence by canonical entity ID.

---

# 31. Resolver Scoring

Post-ASR resolver uses:

```text
exact normalized alias
FTS5
trigram
Double Metaphone
phonetic code distance
validated ASR aliases
phrase coverage
distinctive-token weight
expected entity type
relation context
screen context
small ASR confidence contribution
```

The database match should outweigh recognizer confidence.

Conceptual starting point:

```ts
finalScore =
    entityMatchScore * 0.85
  + asrHypothesisScore * 0.15;
```

Tune with real diagnostics.

---

# 32. Cross-Platform Recognition Profiles

Use a profile factory.

```ts
type RecognitionPurpose =
  | "command"
  | "entity-search"
  | "short-response"
  | "dictation";
```

Factory:

```ts
function buildRecognitionOptions(
  purpose: RecognitionPurpose,
  contextualStrings: string[],
  platformCapabilities: PlatformSpeechCapabilities,
) {
  // returns correct Android/iOS options
}
```

## Command

Android:

```text
EXTRA_LANGUAGE_MODEL = free_form
```

iOS:

```text
iosTaskHint = search
```

## Short response

Android:

```text
EXTRA_LANGUAGE_MODEL = web_search
```

iOS:

```text
iosTaskHint = confirmation
```

## Future dictation

Android:

```text
EXTRA_LANGUAGE_MODEL = free_form
```

iOS:

```text
iosTaskHint = dictation
```

---

# 33. 8-Second Voice Lifecycle — Both Platforms

The timing policy is app-owned and identical on Android and iOS.

```text
VOICE INVOKED
    |
    v
PREPARING
    |
    v
OPENING_MICROPHONE
    |
    v
NATIVE READY / START
    |
    +--> UI = listening
    |
    +--> announce "Speak now"
    |
    +--> start 8-second PRE-SPEECH timeout
    |
    +--> speech starts
            |
            v
        CANCEL 8-second timeout permanently
            |
            v
        SPEECH ACTIVE
            |
            v
        FINAL RESULT
```

If no speech begins after 8 seconds:

```text
NO_SPEECH
 -> stop/cancel recognizer
 -> announce once
 -> return to stable state
```

---

# 34. Long Speech

A user may speak longer than 8 seconds.

Example:

```text
"Play me the latest publication from the talking newspaper
in Herne Bay that I listened to recently."
```

Once native speech-start/activity occurs:

```text
8-second timer is dead
```

Do not cut speech at second 8.

Use native final-result/end signals.

Keep a separate absolute failure guard such as:

```ts
const ABSOLUTE_SESSION_SAFETY_MS = 45_000;
```

This guard protects against a stuck recognizer, not normal speech length.

---

# 35. Permissions

## Android

Require microphone permission.

Speech-recognition service behavior depends on the selected native recognizer.

## iOS

Handle:

```text
Microphone permission
Speech Recognition permission when required by the recognition mode
```

Permissions belong in the bootstrap/capability layer.

Screens should not implement native permission details themselves.

---

# 36. Accessibility

Before any OS permission/model dialog:

```text
1. explain what will happen
2. wait for Hear! speech to finish
3. open native system UI
```

While microphone is active:

```text
no competing non-essential TTS
```

For TalkBack/VoiceOver:

```text
one announcement owner per message
```

Do not duplicate the same message through app TTS and screen-reader announcement.

---

# 37. Diagnostics

Capture:

```text
speech.platform
speech.os_version
speech.profile
speech.locale
speech.recognition_service

speech.on_device_supported
speech.on_device_requested

speech.android_model_status

speech.ios_task_hint
speech.ios_audio_category
speech.ios_voice_processing

speech.contextual_string_count

speech.native_started
speech.speech_started
speech.no_speech_timeout
speech.final_result
speech.alternative_count

speech.filter.filler_count
speech.filter.residual_length

resolver.candidate_count
resolver.winning_method
resolver.final_score
```

Do not retain unrestricted raw speech permanently in production telemetry.

---

# 38. Tests — Android

Required devices:

```text
Pixel
Samsung
at least one non-Google default recognizer device if available
```

Versions:

```text
Android 12 or lower
Android 13
Android 14+
```

Test:

```text
en-GB installed
en-GB missing
download dialog
download success
download scheduled
online recognition
offline recognition
Google service unavailable
default service fallback
free_form command
web_search short response
5 alternatives
contextual strings
8-second no-speech window
speech longer than 8 seconds
TalkBack
Bluetooth headset
speaker
```

---

# 39. Tests — iOS

Test:

```text
en-GB recognition
network recognition
on-device recognition supported
on-device recognition unavailable

iosTaskHint = search
iosTaskHint = confirmation

contextualStrings
5 alternatives
8-second no-speech window
speech longer than 8 seconds

VoiceOver
speaker
Bluetooth
wired audio if available

player audio -> voice invocation -> restore playback
```

Test iOS versions supported by the installed Expo/library version.

---

# 40. Exact Default Settings Summary

## Android normal command

```ts
{
  lang: "en-GB",
  interimResults: true,
  maxAlternatives: 5,
  continuous: false,
  requiresOnDeviceRecognition: false,
  addsPunctuation: false,
  contextualStrings,

  androidIntentOptions: {
    EXTRA_LANGUAGE_MODEL: "free_form",

    // Android 13+: explicitly request native offensive-word masking.
    EXTRA_MASK_OFFENSIVE_WORDS: true,
  },
}
```

## Android short response

```ts
{
  lang: "en-GB",
  interimResults: true,
  maxAlternatives: 5,
  continuous: false,
  requiresOnDeviceRecognition: false,
  addsPunctuation: false,
  contextualStrings,

  androidIntentOptions: {
    EXTRA_LANGUAGE_MODEL: "web_search",

    // Android 13+: mask offensive terms in native recognition output.
    EXTRA_MASK_OFFENSIVE_WORDS: true,
  },
}
```

## iOS normal command

```ts
{
  lang: "en-GB",
  interimResults: true,
  maxAlternatives: 5,
  continuous: false,
  requiresOnDeviceRecognition: false,
  addsPunctuation: false,
  contextualStrings,

  iosTaskHint: "search",

  iosCategory: {
    category: "playAndRecord",
    categoryOptions: [
      "defaultToSpeaker",
      "allowBluetooth",
    ],
    mode: "measurement",
  },

  iosVoiceProcessingEnabled: false,
}
```

## iOS short response

```ts
{
  lang: "en-GB",
  interimResults: true,
  maxAlternatives: 5,
  continuous: false,
  requiresOnDeviceRecognition: false,
  addsPunctuation: false,
  contextualStrings,

  iosTaskHint: "confirmation",

  iosCategory: {
    category: "playAndRecord",
    categoryOptions: [
      "defaultToSpeaker",
      "allowBluetooth",
    ],
    mode: "measurement",
  },

  iosVoiceProcessingEnabled: false,
}
```

---

# 41. Implementation Order

```text
1. Verify expo-speech-recognition version against current Expo SDK.

2. Add platform speech capability/bootstrap layer.

2A. Add `VoicePermissionState`.

2B. Android permission path:
    - get/request microphone permission
    - require `RECORD_AUDIO`
    - honor `canAskAgain`
    - do not request unrelated permissions

2C. iOS permission path:
    - microphone permission always
    - Speech Recognition permission for network-backed recognition
    - handle `denied` vs `restricted`
    - allow on-device fallback when supported

2D. Ensure permission dialogs occur before microphone opening and outside the 8-second timer.

2E. Add `docs/voice/` documentation structure and official references.

2A. Add a shared UK-locale invariant:
    - `lang = "en-GB"` on Android.
    - `lang = "en-GB"` on iOS.
    - do not derive ASR language from device UI locale.

2B. Disable automatic language switching in the normal Hear! profile.

2C. Add the shared UK-English accuracy benchmark corpus.

3. Android:
   - inspect recognition services
   - prefer available Google service
   - fallback to default service

4. Android 13+:
   - inspect en-GB on-device locale
   - trigger model download if missing
   - re-check after dialog/success/scheduled state

5. iOS:
   - inspect recognition availability
   - inspect on-device support
   - do not expose fake model-download control

6. Add recognition-profile.ts.

7. Implement:
   - Android free_form command profile
   - Android web_search short-response profile
   - iOS search command profile
   - iOS confirmation short-response profile

8. Add recognition-dictionary.ts.

9. Add:
   - local command dictionary
   - safe filler dictionary
   - semantic command/modifier dictionary

10. Keep all catalog/entity names in SQLite.

11. Add repository.getRecognitionBiasTerms().

12. Pass dynamic contextualStrings to Android AND iOS.

13. Fix voice-session-engine:
   - native ready before listening
   - "Speak now"
   - start 8-second pre-speech timeout
   - cancel timeout permanently when speech begins
   - add separate absolute safety guard

14. Preserve max 5 ASR alternatives.

15. Add transcript-preparation.ts.

16. Parse/remove safe fillers without destroying entity text.

17. Route local commands locally.

18. Send semantic hypotheses to SQLite resolver.

19. Resolve using:
   exact + FTS5 + trigram + phonetic + validated aliases.

20. Add platform diagnostics.

21. Test Android + iOS accessibility and audio-session behavior.
```

---

# 42. Definition of Done

- [ ] Android and iOS both use `en-GB` as a hard preferred ASR locale, independent of the phone UI locale.
- [ ] Shared recognition options are centralized.
- [ ] Android receives explicit, valid `androidIntentOptions`.
- [ ] iOS receives explicit `iosTaskHint` and audio-session options.
- [ ] Android 13+ can initiate the `en-GB` model download from Hear!.
- [ ] Android model state is re-checked before marking it installed.
- [ ] iOS does not expose a fake model-download workflow.
- [ ] iOS uses on-device recognition only when supported and deliberately selected.
- [ ] Normal content commands use Android `free_form`.
- [ ] Short Android responses may use `web_search`.
- [ ] Normal iOS content commands use `iosTaskHint: "search"`.
- [ ] Short iOS responses use `iosTaskHint: "confirmation"`.
- [ ] Normal recognition uses `continuous: false`.
- [ ] Up to 5 hypotheses are retained.
- [ ] SQLite supplies contextual strings for both Android and iOS.
- [ ] Generic local command dictionary contains no catalog names.
- [ ] Safe filler dictionary removes only context-safe conversational noise.
- [ ] Semantic grammar/modifier dictionary remains generic.
- [ ] Catalog/entity dictionary lives in SQLite.
- [ ] Validated ASR aliases live in SQLite.
- [ ] Common catalog tokens are down-weighted, not blindly deleted.
- [ ] The 8-second timer only limits time to begin speaking.
- [ ] Speech start permanently cancels the 8-second timer.
- [ ] Users may speak longer than 8 seconds.
- [ ] TalkBack and VoiceOver flows are tested.
- [ ] iOS audio-session restoration is tested with playback.
- [ ] Android 13+ explicitly passes `EXTRA_MASK_OFFENSIVE_WORDS: true`.
- [ ] Android below API 33 does not receive the unsupported offensive-word extra.
- [ ] iOS uses the shared Hear! profanity sanitizer because there is no equivalent Expo native masking option.
- [ ] Partial results are sanitized before they are shown.
- [ ] Every ASR alternative is sanitized independently.
- [ ] Offensive terms are removed from normal resolver input according to the configured policy.
- [ ] SQLite/contextual entity phrases are protected from accidental destructive profanity filtering.
- [ ] Production telemetry does not persist unsanitized offensive transcripts.
- [ ] No publisher/creator/publication special cases are added to production TypeScript.

---

# Final Architectural Rule

```text
                 SHARED HEAR! VOICE ENGINE
                           |
          +----------------+----------------+
          |                                 |
       ANDROID                              iOS
          |                                 |
 en-GB + Android intents             en-GB + Apple task hint
          |                                 |
 Android model manager             Apple on-device capability
          |                                 |
          +---------------+-----------------+
                          |
                  SQLite dictionary
                          |
            contextualStrings before ASR
                          |
                          v
                   ASR alternatives
                          |
                          v
               safe transcript parsing
                          |
                          v
         SQLite FTS5 + trigram + phonetic
             + validated ASR aliases
                          |
                          v
             resolved / ambiguity / retry
```

Platform speech engines produce the transcript.

Hear!'s SQLite resolver understands the Hear! catalog.

The dictionary improves recognition on both platforms.

The resolver fixes what recognition still gets wrong.
