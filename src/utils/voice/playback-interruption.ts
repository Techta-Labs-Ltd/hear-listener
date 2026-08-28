import type { PlaybackSnapshot, VoiceExecutorKey } from "@/types";

export function playbackInterruptionPrompt(
  playback: Pick<
    PlaybackSnapshot,
    "current" | "playing" | "progress" | "queueMode"
  >,
): string | undefined {
  if (!playback.current) return undefined;
  if (playback.queueMode === "publication" && playback.progress >= 0.99) {
    return `You finished ${playback.current.publication}. Say give feedback, or tell me what you want to hear next.`;
  }
  if (!playback.playing && playback.progress <= 0) return undefined;
  return `You were listening to ${playback.current.title}. Say continue listening, give feedback, or tell me what you want to hear instead.`;
}

export function shouldResumeAfterPlaybackCommand(
  executorKey: VoiceExecutorKey,
  playbackWasPlaying: boolean,
): boolean {
  if (
    executorKey === "resume" ||
    executorKey === "next" ||
    executorKey === "previous" ||
    executorKey === "restart" ||
    executorKey === "play"
  ) {
    return true;
  }
  if (
    executorKey === "repeat" ||
    executorKey === "seek" ||
    executorKey === "speed" ||
    executorKey === "speedStep"
  ) {
    return playbackWasPlaying;
  }
  return false;
}
