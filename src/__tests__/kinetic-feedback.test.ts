import * as Haptics from "expo-haptics";
import { triggerKineticFeedback } from "@/services/kinetic/kinetic-feedback";
import * as oneShots from "@/lib/audio/one-shots";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: "success" },
  ImpactFeedbackStyle: { Heavy: "heavy", Light: "light" },
}));

jest.mock("@/lib/audio/one-shots", () => ({
  playClick: jest.fn(),
}));

describe("triggerKineticFeedback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("plays click and one haptic on SHAKE gesture", async () => {
    await triggerKineticFeedback("SHAKE", "Voice command");

    expect(oneShots.playClick).toHaveBeenCalled();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success,
    );
  });

  it("plays click and one haptic on NEXT gesture", async () => {
    await triggerKineticFeedback("NEXT", "Next");

    expect(oneShots.playClick).toHaveBeenCalled();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Heavy,
    );
  });

  it("plays click and one haptic on PREVIOUS gesture", async () => {
    await triggerKineticFeedback("PREVIOUS", "Previous");

    expect(oneShots.playClick).toHaveBeenCalled();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Light,
    );
  });
});
