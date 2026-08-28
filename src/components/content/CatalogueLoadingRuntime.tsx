import { useEffect, useRef } from "react";
import { AccessibilityInfo } from "react-native";
import { useAppAccessibility } from "@/providers/AccessibilityProvider";
import { useContentStore, usePlaybackStore } from "@/stores";

export function CatalogueLoadingRuntime() {
  const loading = useContentStore((state) => state.loading);
  const playbackActive = usePlaybackStore(
    (state) => Boolean(state.current && state.playing),
  );
  const { announce, screenReaderEnabled } = useAppAccessibility();
  const announced = useRef(false);

  useEffect(() => {
    if (!loading) {
      announced.current = false;
      return;
    }
    if (announced.current || playbackActive) return;
    announced.current = true;
    const message = "Loading Hear! audio.";
    if (screenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
    } else {
      announce(message, "catalogue:loading");
    }
  }, [announce, loading, playbackActive, screenReaderEnabled]);

  return null;
}
