import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { appAssets } from "@/constants/assets";

let clickPlayer: AudioPlayer | null = null;
let splashPlayer: AudioPlayer | null = null;

function play(player: AudioPlayer | null, source: number): AudioPlayer | null {
  try {
    const active = player ?? createAudioPlayer(source);
    active.seekTo(0);
    active.play();
    return active;
  } catch {
    return player;
  }
}

export function playClick() {
  clickPlayer = play(clickPlayer, appAssets.audio.click);
}

export function playSplash() {
  splashPlayer = play(splashPlayer, appAssets.audio.splash);
}
