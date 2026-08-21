import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { appAssets } from "@/constants/assets";
import { voiceAudioGate } from "@/services/voice/audio-gate";

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
  if (voiceAudioGate.isQuiet()) return;
  clickPlayer = play(clickPlayer, appAssets.audio.click);
}

export function playListeningStartTone() {
  clickPlayer = play(clickPlayer, appAssets.audio.click);
}

export function playSplash() {
  if (voiceAudioGate.isQuiet()) return;
  splashPlayer = play(splashPlayer, appAssets.audio.splash);
}
