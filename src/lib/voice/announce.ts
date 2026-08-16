import { speechCoordinator, type SpeechPriority } from "./speech-coordinator";

export function voiceAnnounce(
  message: string,
  key = `voice:${message}`,
  priority: SpeechPriority = "session",
): Promise<void> {
  speechCoordinator.reset(key);
  return speechCoordinator.announce({ key, text: message, priority });
}
