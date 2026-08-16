import { useEffect } from "react";
import { BackHandler, Pressable } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { StatusBar } from "expo-status-bar";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { useOnboardingSetup } from "@/hooks/useOnboardingSetup";
import { SafeAreaView, ScrollView, View } from "@/tw";

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

  const current = setup.screen === "welcome" ? 1 : setup.screen === "voicePermission" ? 2 : 3;
  const immersive = setup.screen !== "account";

  return (
    <SafeAreaView className={immersive ? "flex-1 bg-voice-canvas" : "flex-1 bg-canvas"}>
      <StatusBar style={immersive ? "light" : "dark"} />
      <View className="flex-1" onLayout={setup.announceCurrent}>
        <Progress current={current} inverse={immersive} />
        <ScrollView
          contentContainerClassName="min-h-full flex-grow justify-between px-6 pb-10 pt-12"
          showsVerticalScrollIndicator={false}
        >
          {setup.screen === "welcome" ? (
            <Welcome screenReaderEnabled={setup.screenReaderEnabled} onContinue={setup.advanceWelcome} />
          ) : setup.screen === "voicePermission" ? (
            <VoicePermission
              screenReaderEnabled={setup.screenReaderEnabled}
              onEnableVoice={setup.startVoicePractice}
              onContinueWithoutVoice={setup.continueWithoutVoice}
            />
          ) : (
            <AccountStep
              provider={setup.account.provider}
              loading={setup.account.status === "signingIn"}
              error={setup.account.error}
              onSignIn={setup.signIn}
              onSkip={setup.skipAccount}
            />
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Progress({ current, inverse }: { current: 1 | 2 | 3; inverse: boolean }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Setup step ${current} of 3`}
      accessibilityValue={{ min: 1, max: 3, now: current }}
      className={inverse ? "h-1 w-full bg-white/20" : "h-1 w-full bg-border"}
    >
      <View
        className={inverse ? "h-full bg-voice-glow" : "h-full bg-primary"}
        style={{ width: `${current * 33.333}%` }}
      />
    </View>
  );
}

function Welcome({ screenReaderEnabled, onContinue }: { screenReaderEnabled: boolean; onContinue: () => void }) {
  return (
    <>
      <View className="max-w-content gap-7">
        <AppText variant="overline" className="text-voice-muted">HEAR!</AppText>
        <AppText
          accessibilityRole="header"
          accessibilityActions={[{ name: "continueSetup", label: "Continue to voice setup" }]}
          accessibilityHint="Moves to the voice access explanation."
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "continueSetup") onContinue();
          }}
          className="font-display text-display leading-[1.05] text-white"
        >
          Listen without searching through screens.
        </AppText>
        <AppText className="max-w-[34rem] text-lg leading-8 text-voice-muted">
          Hear! can read each screen aloud and respond to one voice command at a time.
        </AppText>
      </View>
      <Instruction
        inverse
        text={screenReaderEnabled ? "Activate Continue to voice setup." : "Double-tap anywhere to continue."}
      />
    </>
  );
}

function VoicePermission({
  screenReaderEnabled,
  onEnableVoice,
  onContinueWithoutVoice,
}: {
  screenReaderEnabled: boolean;
  onEnableVoice: () => void;
  onContinueWithoutVoice: () => void;
}) {
  return (
    <>
      <View className="max-w-content gap-9">
        <View className="gap-6">
          <AppText variant="overline" className="text-voice-muted">VOICE ACCESS</AppText>
          <AppText
            accessibilityRole="header"
            accessibilityActions={[{ name: "enableVoice", label: "Enable voice and speak" }]}
            accessibilityHint="Requests microphone and speech access, then listens for one command."
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === "enableVoice") onEnableVoice();
            }}
            className="font-display text-display leading-[1.05] text-white"
          >
            Speak when you choose.
          </AppText>
        </View>
        <View className="gap-5 border-l-2 border-voice-glow pl-5">
          <Statement text="Hear listens only after you double-tap." />
          <Statement text="Each session stops after one command." />
          <Statement text="Your microphone is never left running in the background." />
        </View>
      </View>
      <View className="gap-5 pt-12">
        <Instruction
          inverse
          text={screenReaderEnabled
            ? "Activate Enable voice and speak. Try “Play my local news.”"
            : "Double-tap anywhere to allow access and speak. Try “Play my local news.”"}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue without voice"
          accessibilityHint="Continues without requesting microphone access."
          onPress={onContinueWithoutVoice}
          className="min-h-12 self-start justify-center rounded-xl px-3 active:bg-white/10"
        >
          <AppText className="font-body-semibold text-voice-muted">Continue without voice</AppText>
        </Pressable>
      </View>
    </>
  );
}

function AccountStep({
  provider,
  loading,
  error,
  onSignIn,
  onSkip,
}: {
  provider: "apple" | "google";
  loading: boolean;
  error?: string;
  onSignIn: () => Promise<void>;
  onSkip: () => void;
}) {
  return (
    <>
      <View className="max-w-content gap-7">
        <AppText variant="overline" tone="primary">OPTIONAL ACCOUNT</AppText>
        <AppText accessibilityRole="header" className="font-display text-display leading-[1.05]">
          Keep your listening with you.
        </AppText>
        <AppText className="max-w-[34rem] text-lg leading-8" tone="muted">
          Sign in to prepare Hear! for syncing across devices, or continue without an account.
        </AppText>
        {error ? <AppText accessibilityLiveRegion="polite" tone="danger">{error}</AppText> : null}
      </View>
      <View className="gap-4 pt-12">
        {provider === "apple" ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            style={{ width: "100%", height: 52 }}
            onPress={() => void onSignIn()}
          />
        ) : (
          <Button label="Continue with Google" loading={loading} onPress={() => void onSignIn()} />
        )}
        <Button label="Not now" variant="ghost" onPress={onSkip} />
        <AppText variant="label" tone="muted">
          You can sign in later from Settings. Say “continue” or “not now” after opening voice control.
        </AppText>
      </View>
    </>
  );
}

function Statement({ text }: { text: string }) {
  return <AppText className="text-lg leading-8 text-white">{text}</AppText>;
}

function Instruction({ text, inverse = false }: { text: string; inverse?: boolean }) {
  return (
    <View className={inverse ? "max-w-content border-t border-white/25 pt-5" : "max-w-content border-t border-border-strong pt-5"}>
      <AppText className={inverse ? "font-body-semibold text-lg leading-7 text-white" : "font-body-semibold text-lg leading-7"}>
        {text}
      </AppText>
    </View>
  );
}
