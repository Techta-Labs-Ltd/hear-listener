import { AccessibilityInfo, Platform } from "react-native";
import { playClick } from "@/lib/audio/one-shots";
import { appHaptics } from "@/lib/haptics";
import type { KineticGestureType } from "@/types";

export function announceKineticAction(message: string): void {
  try {
    if (Platform.OS === "ios") {
      AccessibilityInfo.announceForAccessibilityWithOptions(message, {
        queue: true,
      });
    } else if (Platform.OS === "android") {
      AccessibilityInfo.announceForAccessibility(message);
    }
  } catch {}
}

export async function triggerKineticFeedback(
  gesture: KineticGestureType,
  customAnnouncement?: string,
): Promise<void> {
  try {
    if (gesture === "NEXT") {
      playClick();
      await appHaptics.heavy();
      if (customAnnouncement) {
        announceKineticAction(customAnnouncement);
      }
    } else if (gesture === "PREVIOUS") {
      playClick();
      await appHaptics.changed();
      if (customAnnouncement) {
        announceKineticAction(customAnnouncement);
      }
    } else if (gesture === "SHAKE") {
      playClick();
      await appHaptics.success();
      if (customAnnouncement) {
        announceKineticAction(customAnnouncement);
      }
    }
  } catch {}
}
