import { useEffect, useRef } from "react";
import { usePlaybackStore, useVoiceStore } from "@/stores";
import { appHaptics } from "@/lib/haptics";
import { ukSpeech } from "@/lib/voice/speech";

export function PlaybackRuntime() {
  const playing = usePlaybackStore((state) => state.playing);
  const endsAt = usePlaybackStore((state) => state.sleepTimerEndsAt);
  const pause = usePlaybackStore((state) => state.pause);
  const cancel = usePlaybackStore((state) => state.cancelSleepTimer);
  const previousPlaying = useRef(playing);

  useEffect(() => {
    if (previousPlaying.current !== playing) {
      void appHaptics.changed();
      const voiceActive = !["idle", "cancelled"].includes(
        useVoiceStore.getState().state,
      );
      if (!voiceActive) {
        const story = usePlaybackStore.getState().current;
        if (story)
          void ukSpeech.speak(
            playing
              ? `Playing ${story.title}, by ${story.creator}.`
              : `Paused ${story.title}.`,
            { interrupt: false },
          );
      }
      previousPlaying.current = playing;
    }
  }, [playing]);

  useEffect(() => {
    if (!endsAt) return;
    const remaining = endsAt - Date.now();
    if (remaining <= 0) {
      pause();
      cancel();
      return;
    }
    const timer = setTimeout(() => {
      pause();
      cancel();
    }, remaining);
    return () => clearTimeout(timer);
  }, [endsAt, pause, cancel]);
  return null;
}
