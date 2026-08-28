import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioSource,
} from "expo-audio";
import { useEffect, useRef } from "react";
import {
  useContentStore,
  usePlaybackStore,
  useSpeechStore,
} from "@/stores";

export function AudioRuntime() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const current = usePlaybackStore((state) => state.current);
  const playing = usePlaybackStore((state) => state.playing);
  const speed = usePlaybackStore((state) => state.speed);
  const repeat = usePlaybackStore((state) => state.repeat);
  const seekToken = usePlaybackStore((state) => state.seekToken);
  const isSpeaking = useSpeechStore((state) => state.isSpeaking);
  const lastSource = useRef<AudioSource | null>(null);
  const lastSeekToken = useRef(seekToken);
  const lastHistoryCheckpoint = useRef(-1);
  const finishedHistoryItemId = useRef<string | undefined>(undefined);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    });
  }, []);

  useEffect(() => {
    const source = current?.audioUrl ?? null;
    if (source === lastSource.current) return;
    lastSource.current = source;
    lastHistoryCheckpoint.current = -1;
    if (source == null || !current) {
      if (!player.paused) player.pause();
      player.setActiveForLockScreen(false);
      return;
    }
    player.replace(source);
    player.setPlaybackRate(usePlaybackStore.getState().speed);
    player.setActiveForLockScreen(true, {
      title: current.title,
      artist: current.creator,
      albumTitle: current.publication,
    });
  }, [current, player]);

  useEffect(() => {

    player.loop = repeat;
  }, [repeat, player]);

  useEffect(() => {
    if (!status.isLoaded) return;
    const shouldPlay = playing && !isSpeaking;
    if (shouldPlay && !status.playing) player.play();
    if (!shouldPlay && status.playing) player.pause();
  }, [isSpeaking, playing, status.isLoaded, status.playing, player]);

  useEffect(() => {
    player.setPlaybackRate(speed);
  }, [speed, player]);

  useEffect(() => {
    if (seekToken === lastSeekToken.current) return;
    lastSeekToken.current = seekToken;
    const state = usePlaybackStore.getState();
    if (status.duration > 0)
      void player.seekTo(state.progress * status.duration);
  }, [seekToken, status.duration, player]);

  useEffect(() => {
    if (status.duration > 0) {
      usePlaybackStore
        .getState()
        .setTiming(status.currentTime / status.duration, status.duration);
    }
    if (!current || !status.isLoaded) return;
    if (!status.didJustFinish) {
      finishedHistoryItemId.current = undefined;
    } else if (
      finishedHistoryItemId.current &&
      finishedHistoryItemId.current !== current.id
    ) {
      return;
    } else {
      finishedHistoryItemId.current = current.id;
    }
    const checkpoint = Math.floor(status.currentTime / 30);
    if (
      checkpoint === lastHistoryCheckpoint.current &&
      !status.didJustFinish
    ) {
      return;
    }
    lastHistoryCheckpoint.current = checkpoint;
    useContentStore
      .getState()
      .recordHistory(current, status.currentTime, status.didJustFinish);
  }, [
    current,
    status.currentTime,
    status.didJustFinish,
    status.duration,
    status.isLoaded,
  ]);

  useEffect(() => {
    if (status.didJustFinish) {
      usePlaybackStore.getState().handleTrackFinished();
    }
  }, [status.didJustFinish]);

  return null;
}
