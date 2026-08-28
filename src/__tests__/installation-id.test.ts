import { VoiceInstallationIdentity } from "@/services/voice/installation-id";

describe("voice installation identity", () => {
  it("reuses the SecureStore installation identifier", async () => {
    const storage = {
      getItemAsync: jest.fn().mockResolvedValue("stored-installation-id"),
      setItemAsync: jest.fn().mockResolvedValue(undefined),
    };
    const createId = jest.fn(() => "generated-installation-id");
    const identity = new VoiceInstallationIdentity(storage, createId);

    await expect(identity.get()).resolves.toBe("stored-installation-id");
    expect(createId).not.toHaveBeenCalled();
    expect(storage.setItemAsync).not.toHaveBeenCalled();
  });

  it("creates, persists and reuses one identifier when none exists", async () => {
    const storage = {
      getItemAsync: jest.fn().mockResolvedValue(null),
      setItemAsync: jest.fn().mockResolvedValue(undefined),
    };
    const createId = jest.fn(() => "generated-installation-id");
    const identity = new VoiceInstallationIdentity(storage, createId);

    await expect(identity.get()).resolves.toBe("generated-installation-id");
    await expect(identity.get()).resolves.toBe("generated-installation-id");
    expect(createId).toHaveBeenCalledTimes(1);
    expect(storage.setItemAsync).toHaveBeenCalledWith(
      "hear.voice.installation-id.v1",
      "generated-installation-id",
    );
  });
});
