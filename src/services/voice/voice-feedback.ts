import { playClick } from "@/lib/audio/one-shots";
import { appHaptics } from "@/lib/haptics";

export function triggerVoiceCloseFeedback(kind: "cancel" | "error"): void {
  playClick();
  if (kind === "cancel") {
    void appHaptics.selection();
  } else {
    void appHaptics.error();
  }
}
