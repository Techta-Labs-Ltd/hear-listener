import { speechCoordinator } from "./speech-coordinator";
import type { SpeechPriority } from "@/types";

export function voiceAnnounce(
  message: string,
  key = `voice:${message}`,
  priority: SpeechPriority = "session",
): Promise<void> {
  speechCoordinator.reset(key);
  return speechCoordinator.announce({ key, text: message, priority });
}
