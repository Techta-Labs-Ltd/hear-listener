import {
  voiceCopy,
  withVoiceRetryGuidance,
} from "@/utils/copy/voice";

describe("voice retry guidance", () => {
  it("adds the shared shake instruction to a recoverable failure", () => {
    expect(withVoiceRetryGuidance("That command failed")).toBe(
      `That command failed. ${voiceCopy.retryHint}`,
    );
  });

  it("preserves terminal punctuation", () => {
    expect(withVoiceRetryGuidance("Please check your connection.")).toBe(
      `Please check your connection. ${voiceCopy.retryHint}`,
    );
  });

  it("does not repeat existing shake guidance", () => {
    expect(
      withVoiceRetryGuidance(
        "Listening is closed. Shake your device when you're ready.",
      ),
    ).toBe("Listening is closed. Shake your device when you're ready.");
  });

  it("uses the shared instruction when no message is supplied", () => {
    expect(withVoiceRetryGuidance("  ")).toBe(voiceCopy.retryHint);
  });
});
