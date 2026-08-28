import { onboardingCopy } from "@/utils/copy/onboarding";

export const onboardingChapters = onboardingCopy.chapters;

export const ONBOARDING_SPEECH = {
  welcome:
    "Welcome to Hear!. Step 1 of 3. Shake device to continue.",
  welcomeLong:
    "Welcome to Hear!. Step 1 of 3. Hear! what matters. Skip the screens. Hear! helps you listen and use the app without needing to see the screen. Example: Play my local news. Shake device to begin voice setup.",
  permissionIntro:
    "Voice access. Step 2 of 3. Hear! listens only when you ask. The microphone stops after each command. Shake device to continue and your phone will ask for microphone permission.",
  permissionGrantedFirstTest:
    "Microphone access granted. Voice access is ready. Let's try one command. After the tone, say Play my local news.",
  permissionDenied:
    "Voice access. Step 2 of 3. Microphone access is off. Shake device to request microphone permission again.",
  permissionDeniedWeb:
    "Voice access. Step 2 of 3. Microphone access is off. Shake device to request permission, or allow microphone access in your browser address bar.",
  permissionStillDenied:
    "Microphone access is still off. Shake device to open Hear! microphone settings.",
  permissionStillDeniedWeb:
    "Microphone access is still off. Shake device to request permission, or allow microphone access in your browser address bar.",
  permissionNowOn:
    "Microphone access is now on. Let's try your first voice command. After the tone, say Play my local news.",
  permissionBlocked:
    "Voice access. Step 2 of 3. Microphone access is off. Shake device to open Hear! microphone settings.",
  voiceTestNoSpeech:
    "I didn't hear anything. Shake your device to try again.",
  voiceTestNotRecognised:
    "I heard you, but I couldn't match that command. Shake your device to try again. After the tone, say Play my local news.",
  voiceTestCancel:
    "Voice test stopped. Shake your device when you're ready to try again.",
  voiceTestError:
    "Voice recognition couldn't start. Shake your device to try again.",
  voiceTestSuccess:
    "Voice access is working. Step 2 complete. Moving to the final setup step.",
  account:
    "Optional account. Step 3 of 3. An account keeps your saved audio and listening progress with you. Say Apple, or Not now.",
  accountIos:
    "Optional account. Step 3 of 3. An account keeps your saved audio and listening progress with you. Say Apple, or Not now.",
  accountAndroid:
    "Optional account. Step 3 of 3. An account keeps your saved audio and listening progress with you. Say Google, or Not now.",
  accountTimeout:
    "I didn't hear a choice. Shake your device when you're ready.",
  accountUnrecognised:
    "I didn't match that choice. Shake your device when you're ready.",
  accountUnrecognisedIos:
    "I didn't match that choice. Say Apple, or Not now.",
  accountUnrecognisedAndroid:
    "I didn't match that choice. Say Google, or Not now.",
  accountCancelled:
    "Sign-in was cancelled.",
  accountCancelledIos:
    "Sign-in was cancelled. Say Apple, or Not now.",
  accountCancelledAndroid:
    "Sign-in was cancelled. Say Google, or Not now.",
  accountFailed:
    "Sign-in didn't complete.",
  accountFailedIos:
    "Sign-in didn't complete. Say Apple to try again, or say Not now.",
  accountFailedAndroid:
    "Sign-in didn't complete. Say Google to try again, or say Not now.",
  complete:
    "Setup complete. Hear! is ready.",
  completeWithVoice:
    "Setup complete. Hear! is ready.",
  completeWithoutVoice:
    "Setup complete. Hear! is ready. You can enable voice access later in Settings.",
  access:
    "Voice access. Step 2 of 3. Hear! listens only when you ask. The microphone stops after each command. Shake device to continue and your phone will ask for microphone permission.",
  test: "Listening. Speak naturally. Say: Play my local news.",
} as const;
