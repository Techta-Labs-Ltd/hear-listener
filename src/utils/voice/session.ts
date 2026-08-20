export function generateVoiceSessionId(): string {
  return `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
