import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from "expo-keep-awake";
import { useEffect } from "react";
import { AppState } from "react-native";
import { usePlaybackStore, useVoiceStore } from "@/stores";

const KEEP_AWAKE_TAG = "hear-active-session";
const activeVoiceStates = new Set([
  "preparing",
  "listening",
  "resolving",
  "clarifying",
  "executing",
]);

export function AppActivityRuntime() {
  const playing = usePlaybackStore((state) => state.playing);
  const voiceState = useVoiceStore((state) => state.state);
  const active = playing || activeVoiceStates.has(voiceState);

  useEffect(() => {
    if (!active || AppState.currentState !== "active") {
      void releaseWakeLock();
      return;
    }

    void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    return () => {
      void releaseWakeLock();
    };
  }, [active]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && active) {
        void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
      } else {
        void releaseWakeLock();
      }
    });

    return () => subscription.remove();
  }, [active]);

  return null;
}

async function releaseWakeLock() {
  try {
    await deactivateKeepAwake(KEEP_AWAKE_TAG);
  } catch {

  }
}
