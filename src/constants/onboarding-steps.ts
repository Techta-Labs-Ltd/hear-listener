import { onboardingCopy } from "@/utils/copy/onboarding";

export const onboardingChapters = onboardingCopy.chapters;

export const ONBOARDING_SPEECH = {
  welcome:
    "Welcome to Hear. Step 1 of 3. Double-tap anywhere to continue.",
  welcomeLong:
    "Welcome to Hear. Step 1 of 3. Hear helps you use the app through spoken guidance and voice. Double-tap anywhere to continue.",
  permissionIntro:
    "Voice access. Step 2 of 3. Hear listens only when you ask. The microphone stops after each command. Double-tap anywhere to continue and your phone will ask for microphone permission.",
  permissionGrantedFirstTest:
    "Microphone access granted. Voice access is ready. Let's try one command. After the tone, say Play my local news.",
  permissionDenied:
    "Voice access. Step 2 of 3. Microphone access is off. Double-tap anywhere to open Settings.",
  permissionStillDenied:
    "Microphone access is still off. Double-tap anywhere to open Settings.",
  permissionNowOn:
    "Microphone access is now on. Let's try your first voice command. After the tone, say Play my local news.",
  permissionBlocked:
    "Microphone access is off. Double-tap anywhere to open Settings.",
  voiceTestNoSpeech:
    "I didn't hear anything. Double-tap anywhere to try again.",
  voiceTestNotRecognised:
    "I heard you, but I couldn't match that command. Double-tap anywhere to try again. After the tone, say Play my local news.",
  voiceTestCancel:
    "Voice test stopped. Double-tap anywhere when you're ready to try again.",
  voiceTestError:
    "Voice recognition couldn't start. Double-tap anywhere to try again.",
  voiceTestSuccess:
    "Voice access is working. Step 2 complete. Moving to the final setup step.",
  account:
    "Optional account. Step 3 of 3. An account keeps your saved audio and listening progress with you. Say Apple, Google, or Not now.",
  accountTimeout:
    "I didn't hear a choice. Double-tap anywhere when you're ready.",
  accountUnrecognised:
    "I didn't match that choice. Say Apple, Google, or Not now.",
  accountCancelled:
    "Sign-in was cancelled. Say Apple, Google, or Not now.",
  accountFailed:
    "Sign-in didn't complete. Say Apple or Google to try again, or say Not now.",
  complete:
    "Setup complete. Hear is ready.",
  completeWithVoice:
    "Setup complete. Hear is ready.",
  completeWithoutVoice:
    "Setup complete. Hear is ready. You can enable voice access later in Settings.",
  // Legacy aliases
  access:
    "Voice access. Step 2 of 3. Hear listens only when you ask. The microphone stops after each command. Double-tap anywhere to continue and your phone will ask for microphone permission.",
  test: "Listening. Speak naturally. Say: Play my local news.",
} as const;

