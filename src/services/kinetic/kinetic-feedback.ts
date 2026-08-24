import { AccessibilityInfo, Platform, Vibration } from "react-native";
import * as Haptics from "expo-haptics";
import { playClick } from "@/lib/audio/one-shots";
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
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {}
      try {
        Vibration.vibrate(50);
      } catch {}
      if (customAnnouncement) {
        announceKineticAction(customAnnouncement);
      }
    } else if (gesture === "PREVIOUS") {
      playClick();
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, 80);
      } catch {}
      try {
        Vibration.vibrate([0, 30, 40, 30]);
      } catch {}
      if (customAnnouncement) {
        announceKineticAction(customAnnouncement);
      }
    } else if (gesture === "SHAKE") {
      playClick();
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      } catch {}
      try {
        Vibration.vibrate([0, 70, 50, 70]);
      } catch {}
      if (customAnnouncement) {
        announceKineticAction(customAnnouncement);
      }
    }
  } catch {}
}
