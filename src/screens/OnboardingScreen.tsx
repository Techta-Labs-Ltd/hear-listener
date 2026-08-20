import { useEffect } from "react";
import { BackHandler } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useOnboardingSetup } from "@/hooks/useOnboardingSetup";
import { View } from "@/tw";
import { WelcomeStep } from "@/components/onboarding/WelcomeStep";
import { VoiceAccessStep } from "@/components/onboarding/VoiceAccessStep";
import { VoiceTestStep } from "@/components/onboarding/VoiceTestStep";
import { AccountStep } from "@/components/onboarding/AccountStep";

export function OnboardingScreen() {
  const setup = useOnboardingSetup();

  useEffect(() => {
    if (setup.screen === "welcome") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setup.back();
      return true;
    });
    return () => subscription.remove();
  }, [setup]);

  const heroStep = setup.screen === "welcome" || setup.screen === "voiceAccess";

  return (
    <View className="flex-1 bg-canvas" onLayout={setup.announceCurrent}>
      <StatusBar style={heroStep ? "light" : "dark"} />

      {setup.screen === "welcome" && (
        <WelcomeStep
          screenReaderEnabled={setup.screenReaderEnabled}
          onContinue={setup.advanceWelcome}
        />
      )}

      {setup.screen === "voiceAccess" && (
        <VoiceAccessStep
          screenReaderEnabled={setup.screenReaderEnabled}
          onEnableVoice={setup.startVoicePractice}
        />
      )}

      {setup.screen === "voiceTest" && (
        <VoiceTestStep
          screenReaderEnabled={setup.screenReaderEnabled}
          voiceState={setup.voiceState}
          voiceMessage={setup.voiceMessage}
        />
      )}

      {setup.screen === "account" && (
        <AccountStep
          screenReaderEnabled={setup.screenReaderEnabled}
          signingIn={setup.account.status === "signingIn"}
          error={setup.account.error}
          onSignIn={(provider) => void setup.signIn(provider)}
          onSkip={setup.skipAccount}
        />
      )}
    </View>
  );
}
