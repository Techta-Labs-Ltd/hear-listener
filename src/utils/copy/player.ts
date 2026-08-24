export const playerCopy = {
  close: "Close player",
  eyebrow: "NOW PLAYING",
  playerEyebrow: "PLAYER",
  finishedEyebrow: "FINISHED",
  rewind: "Rewind 15 seconds",
  forward: "Forward 15 seconds",
  pause: "Pause",
  play: "Play",
  sleep: "☾ Sleep",
  save: "♡ Save",
  saved: "♡ Saved",
  buffering: "Buffering audio…",
  bufferingVoice: "Voice command: “Cancel playback.”",
  emptyTitle: "Nothing queued",
  emptyDescription: "Pick a story, or ask Hear! to play something for you.",
  browse: "Browse audio",
  speak: "Shake to speak",
  finishedTitle: "That’s the end.",
  finishedNext: "Play next story",
  finishedReplay: "Replay",
} as const;

export const queueCopy = {
  title: "Up next",
  open: "Open the queue",
  back: "Back to player",
  playingEyebrow: "PLAYING",
  nextTitle: "Next",
  clear: "Clear queue…",
  emptyTitle: "Queue is empty",
  emptyDescription: "Queued stories appear here while you listen.",
  voiceEyebrow: "VOICE",
  voiceText: "“Move Transit changes to the top.”",
} as const;

export const sleepTimerCopy = {
  title: "Sleep timer",
  prompt: "Stop playback after…",
  close: "Close sleep timer",
  set: "Set timer",
  options: [
    { id: "15", label: "15 minutes" },
    { id: "30", label: "30 minutes" },
    { id: "end", label: "End of this story" },
  ],
} as const;
