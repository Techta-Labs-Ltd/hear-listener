import { phoneticKey, voiceTrigrams } from "@/services/voice/normalize";
import { VoicePackManager } from "@/services/voice/updates";
import type { VoicePackManifest } from "@/types";

const manifest: VoicePackManifest = {
  manifestVersion: 1,
  vocabularyVersion: "2.1.0",
  schemaVersion: 4,
  minimumAppVersion: "1.0.0",
  createdAt: "2026-08-14T00:00:00Z",
  sha256: "00",
  signature: "signature",
  keyId: "production-1",
  downloadUrl: "https://invalid.example/voice.db",
  attribution: "SimpleMaps UK Cities Basic, CC BY 4.0",
};
describe("production voice safeguards", () => {
  it("builds stable trigrams and phonetic keys for UK ASR fallback", () => {
    expect(voiceTrigrams("Wi-Fi settings")).toContain("set");
    expect(phoneticKey("colour")).toBe(phoneticKey("color"));
  });
  it("keeps vocabulary updates disabled without a pinned signature verifier", async () => {
    await expect(
      new VoicePackManager().install(manifest, "1.0.0", 4),
    ).resolves.toEqual({ activated: false, reason: "disabled" });
  });
  it("rejects incompatible packs before attempting a download", async () => {
    const verifier = { verify: jest.fn().mockResolvedValue(true) };
    const activate = jest.fn().mockResolvedValue(true);
    const manager = new VoicePackManager(verifier, activate);
    await expect(
      manager.install({ ...manifest, schemaVersion: 5 }, "1.0.0", 4),
    ).resolves.toEqual({ activated: false, reason: "incompatible" });
    expect(verifier.verify).not.toHaveBeenCalled();
    expect(activate).not.toHaveBeenCalled();
  });
});
