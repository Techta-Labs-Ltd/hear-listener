import { appHaptics } from "@/lib/haptics";
import * as oneShots from "@/lib/audio/one-shots";
import { triggerVoiceCloseFeedback } from "@/services/voice/voice-feedback";

jest.mock("@/lib/audio/one-shots", () => ({
  playClick: jest.fn(),
}));

jest.mock("@/lib/haptics", () => ({
  appHaptics: {
    selection: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("triggerVoiceCloseFeedback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("plays a click and light haptic when the user closes voice", () => {
    triggerVoiceCloseFeedback("cancel");

    expect(oneShots.playClick).toHaveBeenCalledTimes(1);
    expect(appHaptics.selection).toHaveBeenCalledTimes(1);
    expect(appHaptics.error).not.toHaveBeenCalled();
  });

  it("plays a click and error haptic when voice ends automatically", () => {
    triggerVoiceCloseFeedback("error");

    expect(oneShots.playClick).toHaveBeenCalledTimes(1);
    expect(appHaptics.error).toHaveBeenCalledTimes(1);
    expect(appHaptics.selection).not.toHaveBeenCalled();
  });
});
