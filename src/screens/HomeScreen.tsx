import { useEffect } from "react";
import { RefreshControl } from "react-native";
import { AppScreen } from "@/components/ui/AppScreen";
import { ReturningHome } from "@/components/home/ReturningHome";
import { FirstUseHome } from "@/components/home/FirstUseHome";
import { HomeSkeleton } from "@/components/home/HomeSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useContent, usePlayback, usePreferencesStore } from "@/stores";
import { useKineticGestures } from "@/hooks/useKineticGestures";
import { ScrollView } from "@/tw";

export function HomeScreen() {
  const guideDismissed = usePreferencesStore((state) => state.homeGuideDismissed);
  const updatePreferences = usePreferencesStore((state) => state.updatePreferences);
  const {
    stories,
    loading,
    refreshing,
    initialLoadComplete,
    error,
    refresh,
    fetchCatalogue,
  } = useContent();
  const playback = usePlayback();

  useKineticGestures({
    onNext: () => playback.next(),
    onPrevious: () => playback.previous(),
  });

  useEffect(() => {
    void fetchCatalogue();
  }, [fetchCatalogue]);

  const initialLoading =
    stories.length === 0 && (!initialLoadComplete || loading || refreshing);

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
        {initialLoading ? (
          <HomeSkeleton />
        ) : error && stories.length === 0 ? (
          <EmptyState
            icon="network"
            title="Hear! audio could not load"
            description={error}
            actionLabel="Try loading audio again"
            onAction={() => void fetchCatalogue()}
          />
        ) : stories.length === 0 ? (
          <EmptyState
            icon="waveform"
            title="No audio is available yet"
            description="Pull down to refresh or try again shortly."
            actionLabel="Refresh Hear! audio"
            onAction={() => void refresh()}
          />
        ) : guideDismissed ? (
          <ReturningHome />
        ) : (
          <FirstUseHome onDismiss={() => updatePreferences({ homeGuideDismissed: true })} />
        )}
      </ScrollView>
    </AppScreen>
  );
}
