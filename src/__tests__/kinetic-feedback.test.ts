import { Vibration } from "react-native";
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
  let vibrateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    vibrateSpy = jest.spyOn(Vibration, "vibrate").mockImplementation(() => {});
  });

  afterEach(() => {
    vibrateSpy.mockRestore();
  });

  it("plays click and vibrates on SHAKE gesture", async () => {
    await triggerKineticFeedback("SHAKE", "Voice command");

    expect(oneShots.playClick).toHaveBeenCalled();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success,
    );
    expect(vibrateSpy).toHaveBeenCalledWith([0, 70, 50, 70]);
  });

  it("plays click and vibrates on NEXT gesture", async () => {
    await triggerKineticFeedback("NEXT", "Next");

    expect(oneShots.playClick).toHaveBeenCalled();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Heavy,
    );
    expect(vibrateSpy).toHaveBeenCalledWith(50);
  });

  it("plays click and vibrates on PREVIOUS gesture", async () => {
    await triggerKineticFeedback("PREVIOUS", "Previous");

    expect(oneShots.playClick).toHaveBeenCalled();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Light,
    );
    expect(vibrateSpy).toHaveBeenCalledWith([0, 30, 40, 30]);
  });
});
