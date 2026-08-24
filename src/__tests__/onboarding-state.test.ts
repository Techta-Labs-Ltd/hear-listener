import { ONBOARDING_SPEECH } from "@/constants/onboarding-steps";
import { onboardingCopyPresets } from "@/data/onboarding";

describe("Onboarding Spec Verification", () => {
  describe("ONBOARDING_SPEECH copy compliance with Section 47", () => {
    it("has exact welcome speech matching Spec §47", () => {
      expect(ONBOARDING_SPEECH.welcome).toBe(
        "Welcome to Hear. Step 1 of 3. Shake device to continue.",
      );
    });

    it("has exact permission intro speech matching Spec §47", () => {
      expect(ONBOARDING_SPEECH.permissionIntro).toBe(
        "Voice access. Step 2 of 3. Hear listens only when you ask. The microphone stops after each command. Shake device to continue and your phone will ask for microphone permission.",
      );
    });

    it("has exact permission granted first test speech matching Spec §47", () => {
      expect(ONBOARDING_SPEECH.permissionGrantedFirstTest).toBe(
        "Microphone access granted. Voice access is ready. Let's try one command. After the tone, say Play my local news.",
      );
    });

    it("has exact permission denied speech matching Spec §47", () => {
      expect(ONBOARDING_SPEECH.permissionDenied).toBe(
        "Voice access. Step 2 of 3. Microphone access is off. Shake device to open Settings.",
      );
      expect(ONBOARDING_SPEECH.permissionStillDenied).toBe(
        "Microphone access is still off. Shake device to open Settings.",
      );
    });

    it("has exact returned from settings speech matching Spec §47", () => {
      expect(ONBOARDING_SPEECH.permissionNowOn).toBe(
        "Microphone access is now on. Let's try your first voice command. After the tone, say Play my local news.",
      );
    });

    it("has exact voice test retry messages matching Spec §47", () => {
      expect(ONBOARDING_SPEECH.voiceTestNoSpeech).toBe(
        "I didn't hear anything. Shake your device to try again.",
      );
      expect(ONBOARDING_SPEECH.voiceTestNotRecognised).toBe(
        "I heard you, but I couldn't match that command. Shake your device to try again. After the tone, say Play my local news.",
      );
      expect(ONBOARDING_SPEECH.voiceTestCancel).toBe(
        "Voice test stopped. Shake your device when you're ready to try again.",
      );
      expect(ONBOARDING_SPEECH.voiceTestError).toBe(
        "Voice recognition couldn't start. Shake your device to try again.",
      );
    });

    it("has exact voice test success speech matching Spec §47", () => {
      expect(ONBOARDING_SPEECH.voiceTestSuccess).toBe(
        "Voice access is working. Step 2 complete. Moving to the final setup step.",
      );
    });

    it("has exact account speech matching platform capabilities", () => {
      expect(ONBOARDING_SPEECH.accountIos).toBe(
        "Optional account. Step 3 of 3. An account keeps your saved audio and listening progress with you. Say Apple, or Not now.",
      );
      expect(ONBOARDING_SPEECH.accountAndroid).toBe(
        "Optional account. Step 3 of 3. An account keeps your saved audio and listening progress with you. Say Google, or Not now.",
      );
    });

    it("has exact completion speech variants", () => {
      expect(ONBOARDING_SPEECH.complete).toBe(
        "Setup complete. Hear is ready.",
      );
      expect(ONBOARDING_SPEECH.completeWithoutVoice).toBe(
        "Setup complete. Hear is ready. You can enable voice access later in Settings.",
      );
    });
  });

  describe("onboardingCopyPresets validity", () => {
    it("provides valid presets for all 3 chapters", () => {
      expect(onboardingCopyPresets.welcome).toBeDefined();
      expect(onboardingCopyPresets.voiceAccess).toBeDefined();
      expect(onboardingCopyPresets.account).toBeDefined();
    });
  });
});
