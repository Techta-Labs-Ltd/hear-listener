import { useEffect } from "react";
import { RefreshControl } from "react-native";
import { AppScreen } from "@/components/ui/AppScreen";
import { ReturningHome } from "@/components/home/ReturningHome";
import { FirstUseHome } from "@/components/home/FirstUseHome";
import { HomeSkeleton } from "@/components/home/HomeSkeleton";
import { useContent, usePlayback, usePreferencesStore } from "@/stores";
import { useKineticGestures } from "@/hooks/useKineticGestures";
import { ScrollView } from "@/tw";

export function HomeScreen() {
  const guideDismissed = usePreferencesStore((state) => state.homeGuideDismissed);
  const updatePreferences = usePreferencesStore((state) => state.updatePreferences);
  const { loading, refreshing, refresh, fetchCatalogue } = useContent();
  const playback = usePlayback();

  useKineticGestures({
    onNext: () => playback.next(),
    onPrevious: () => playback.previous(),
  });

  useEffect(() => {
    void fetchCatalogue();
  }, [fetchCatalogue]);

  return (
    <AppScreen
      screenTitle="Home"
      screenOrientation="Home. Say play local news, open Discover, open Library, or read this screen."
      voiceCommands={["play local news", "open Discover", "open Library", "read this screen"]}
    >
      <ScrollView
        contentContainerClassName="px-4 sm:px-5 pt-4 sm:pt-8 pb-[140px]"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />
        }
      >
        {loading ? (
          <HomeSkeleton />
        ) : guideDismissed ? (
          <ReturningHome />
        ) : (
          <FirstUseHome onDismiss={() => updatePreferences({ homeGuideDismissed: true })} />
        )}
      </ScrollView>
    </AppScreen>
  );
}
