import * as Haptics from "expo-haptics";
import { DEFAULT_KINETIC_CONFIG } from "@/constants/kinetic";
import { suppressKineticShakeFor } from "@/services/kinetic/kinetic-interference";

async function safely(trigger: () => Promise<void>) {
  try {
    suppressKineticShakeFor(DEFAULT_KINETIC_CONFIG.shakeFeedbackSuppressionMs);
    await trigger();
  } catch {}
}

export const appHaptics = {
  listening() {
    return safely(() => Haptics.selectionAsync());
  },
  selection() {
    return safely(() => Haptics.selectionAsync());
  },
  changed() {
    return safely(() =>
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    );
  },
  heavy() {
    return safely(() =>
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
    );
  },
  success() {
    return safely(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    );
  },
  clarification() {
    return safely(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    );
  },
  error() {
    return safely(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    );
  },
};
