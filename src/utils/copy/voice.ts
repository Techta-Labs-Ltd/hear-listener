export const voiceCopy = {
  close: "Close voice control",
  access: "VOICE ACCESS",
  speak: "Speak to Hear!",
  done: "Done speaking",
  retry: "Try voice again",
  stopHint: "Shake device to stop",
  retryHint: "Shake device to try again.",
  closedAnnounce: "Voice is closed. Shake device to speak again.",
  unavailableHint: "You can continue using the controls on this screen.",
  nextHint: "Tilt right for next, tilt left for previous",
  thinkingHint: "Just a moment",
  chooseHint: "Tap a choice to continue",
  idleHint: "Shake device to speak",
  listeningPrompt: "Voice is listening. You're on",
  anythingElse: "Anything else? Say another command, or shake device to pause.",
  pausedAnnounce: "I'll pause listening. Shake your device when you're ready to talk.",
  permissionExplain:
    "Hear! asks for microphone and speech access to hear your commands. The microphone only listens after you ask Hear! to listen. You can also shake your device anywhere to start a voice command.",
} as const;

const SHAKE_GUIDANCE_PATTERN = /\bshake (?:your |the )?device\b/i;

export function withVoiceRetryGuidance(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return voiceCopy.retryHint;
  if (SHAKE_GUIDANCE_PATTERN.test(trimmed)) return trimmed;

  const sentence = /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  return `${sentence} ${voiceCopy.retryHint}`;
}
