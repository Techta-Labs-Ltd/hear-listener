import {
  Outfit_500Medium,
  Outfit_600SemiBold,
} from "@expo-google-fonts/outfit";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useFonts } from "expo-font";
import { useAssets } from "expo-asset";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { PlaybackRuntime } from "@/components/player/PlaybackRuntime";
import { AppActivityRuntime } from "@/components/player/AppActivityRuntime";
import { AccountRuntime } from "@/components/account/AccountRuntime";
import { AudioRuntime } from "@/lib/audio/AudioRuntime";
import { RootNavigator } from "./RootNavigator";
import { LoadingScreen } from "@/components/brand/LoadingScreen";
import { AnimatedLaunchScreen } from "@/components/brand/AnimatedLaunchScreen";
import { ALL_APP_ASSETS } from "@/constants/assets";
import { AppProviders } from "@/providers";

void SplashScreen.preventAutoHideAsync();

export function AppRoot() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_500Medium,
    Outfit_600SemiBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const [assetsLoaded, assetsError] = useAssets(ALL_APP_ASSETS);
  const [launchComplete, setLaunchComplete] = useState(false);

  if ((!fontsLoaded && !fontError) || (!assetsLoaded && !assetsError)) {
    return <LoadingScreen />;
  }

  return (
    <AppProviders kineticActive={launchComplete}>
      {launchComplete ? (
        <>
          <PlaybackRuntime />
          <AudioRuntime />
          <AppActivityRuntime />
          <AccountRuntime />
          <StatusBar style="dark" />
          <RootNavigator />
        </>
      ) : (
        <AnimatedLaunchScreen onComplete={() => setLaunchComplete(true)} />
      )}
    </AppProviders>
  );
}
