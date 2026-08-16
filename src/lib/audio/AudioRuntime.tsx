import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioSource,
} from "expo-audio";
import { useEffect, useRef } from "react";
import { usePlaybackStore } from "@/stores";

export function AudioRuntime() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const current = usePlaybackStore((state) => state.current);
  const playing = usePlaybackStore((state) => state.playing);
  const speed = usePlaybackStore((state) => state.speed);
  const repeat = usePlaybackStore((state) => state.repeat);
  const seekToken = usePlaybackStore((state) => state.seekToken);
  const lastSource = useRef<AudioSource | null>(null);
  const lastSeekToken = useRef(seekToken);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
    });
  }, []);

  useEffect(() => {
    const source = current?.audioUrl ?? null;
    if (source === lastSource.current) return;
    lastSource.current = source;
    if (source == null) {
      if (!player.paused) player.pause();
      return;
    }
    player.replace(source);
    player.setPlaybackRate(usePlaybackStore.getState().speed);
  }, [current, player]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- expo-audio exposes `loop` as a mutable native property.
    player.loop = repeat;
  }, [repeat, player]);

  useEffect(() => {
    if (!status.isLoaded) return;
    if (playing && !status.playing) player.play();
    if (!playing && status.playing) player.pause();
  }, [playing, status.isLoaded, status.playing, player]);

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
    if (status.duration > 0)
      usePlaybackStore
        .getState()
        .setTiming(status.currentTime / status.duration, status.duration);
  }, [status.currentTime, status.duration]);

  useEffect(() => {
    if (status.didJustFinish) usePlaybackStore.getState().next();
  }, [status.didJustFinish]);

  return null;
}
