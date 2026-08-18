import { useOnboardingSetup } from "@/hooks/useOnboardingSetup";
import { View } from "@/tw";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { BackHandler } from "react-native";
import { AccountStep } from "./AccountStep";

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

      <AccountStep
        screenReaderEnabled={setup.screenReaderEnabled}
        signingIn={setup.account.status === "signingIn"}
        error={setup.account.error}
        onSignIn={(provider) => void setup.signIn(provider)}
        onSkip={setup.skipAccount}
      />
    </View>
  );
}
