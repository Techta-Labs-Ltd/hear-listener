import { useEffect } from "react";
import { BackHandler } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useOnboardingSetup } from "@/hooks/useOnboardingSetup";
import { View } from "@/tw";
import { WelcomeStep } from "@/components/onboarding/WelcomeStep";
import { VoiceAccessStep } from "@/components/onboarding/VoiceAccessStep";
import { AccountStep } from "@/components/onboarding/AccountStep";

export function OnboardingScreen() {
  const setup = useOnboardingSetup();

  useEffect(() => {
    if (setup.phase === "welcome") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setup.back();
      return true;
    });
    return () => subscription.remove();
  }, [setup]);

  return (
    <View className="flex-1 bg-canvas">
      <StatusBar style="dark" />

      {setup.phase === "welcome" && (
        <WelcomeStep
          screenReaderEnabled={setup.screenReaderEnabled}
          onContinue={setup.advanceWelcome}
        />
      )}

      {setup.screen === "voiceAccess" && (
        <VoiceAccessStep
          phase={setup.phase}
          screenReaderEnabled={setup.screenReaderEnabled}
          voiceState={setup.voiceState}
          voiceMessage={setup.voiceMessage}
          transcript={setup.transcript}
          deadlineAt={setup.deadlineAt}
          speechDetected={setup.speechDetected}
          onRequestPermission={setup.requestPermission}
          onOpenSettings={setup.openSettings}
          onRetryVoiceTest={setup.retryVoiceTest}
        />
      )}

      {setup.phase === "account" && (
        <AccountStep
          screenReaderEnabled={setup.screenReaderEnabled}
          signingIn={setup.account.status === "signingIn"}
          error={setup.account.error}
          voiceState={setup.voiceState}
          voiceMessage={setup.voiceMessage}
          transcript={setup.transcript}
          deadlineAt={setup.deadlineAt}
          speechDetected={setup.speechDetected}
          onSignIn={(provider) => void setup.signIn(provider)}
          onSkip={setup.skipAccount}
          onDoubleTap={setup.startAccountVoiceSelection}
        />
      )}
    </View>
  );
}
