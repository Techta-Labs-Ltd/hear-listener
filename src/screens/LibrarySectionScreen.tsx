import { useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { AppScreen } from "@/components/ui/AppScreen";
import { SavedSection } from "@/components/library/SavedSection";
import { DownloadsSection } from "@/components/library/DownloadsSection";
import { FollowingSection } from "@/components/library/FollowingSection";
import { HistorySection } from "@/components/library/HistorySection";
import { SectionListSkeleton } from "@/components/library/LibrarySkeleton";
import { useContent } from "@/stores";
import { parseLibrarySection } from "@/navigation/routes";
import { ScrollView } from "@/tw";

export function LibrarySectionScreen() {
  const activeSection = parseLibrarySection(
    useLocalSearchParams<{ section?: string }>().section,
  );
  const {
    stories,
    loading,
    refreshing,
    initialLoadComplete,
    fetchCatalogue,
  } = useContent();

  useEffect(() => {
    if (activeSection !== "history") void fetchCatalogue();
  }, [activeSection, fetchCatalogue]);

  const catalogueLoading =
    activeSection !== "history" &&
    stories.length === 0 &&
    (!initialLoadComplete || loading || refreshing);

  return (
    <AppScreen
      screenTitle={`Library: ${activeSection}`}
      screenOrientation="Library section. Say play, go back, or read this screen."
      voiceCommands={["play", "go back", "read this screen"]}
    >
      <ScrollView
        contentContainerClassName="px-5 pt-4 pb-[40px]"
        showsVerticalScrollIndicator={false}
      >
        {catalogueLoading ? (
          <SectionListSkeleton />
        ) : activeSection === "saved" ? (
          <SavedSection />
        ) : activeSection === "downloads" ? (
          <DownloadsSection />
        ) : activeSection === "following" ? (
          <FollowingSection />
        ) : (
          <HistorySection />
        )}
      </ScrollView>
    </AppScreen>
  );
}
