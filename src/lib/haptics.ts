import * as Haptics from "expo-haptics";

async function safely(trigger: () => Promise<void>) {
  try {
    await trigger();
  } catch {

  }
}

export const appHaptics = {
  listening() {
    return safely(() => Haptics.selectionAsync());
  },
  changed() {
    return safely(() =>
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
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
