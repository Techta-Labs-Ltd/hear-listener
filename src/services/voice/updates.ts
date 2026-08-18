import { CryptoDigestAlgorithm, digest } from "expo-crypto";
import { File, Paths } from "expo-file-system";
import type {
  VoicePackActivator,
  VoicePackManifest,
  VoicePackResult,
  VoicePackSignatureVerifier,
} from "@/types";

export class VoicePackManager {
  constructor(
    private readonly verifier?: VoicePackSignatureVerifier,
    private readonly activate?: VoicePackActivator,
  ) {}
  async install(
    manifest: VoicePackManifest,
    currentAppVersion: string,
    currentSchema: number,
    signal?: AbortSignal,
  ): Promise<VoicePackResult> {
    if (!this.verifier || !this.activate)
      return { activated: false, reason: "disabled" };
    if (
      manifest.manifestVersion !== 1 ||
      manifest.schemaVersion !== currentSchema ||
      compareVersions(currentAppVersion, manifest.minimumAppVersion) < 0
    )
      return { activated: false, reason: "incompatible" };
    if (signal?.aborted) return { activated: false, reason: "cancelled" };
    if (!isSecureDownloadUrl(manifest.downloadUrl))
      return { activated: false, reason: "download" };
    const staged = new File(
      Paths.cache,
      `hear-voice-${safeVersion(manifest.vocabularyVersion)}.staged.db`,
    );
    try {
      await File.downloadFileAsync(manifest.downloadUrl, staged, {
        idempotent: true,
      });
      if (signal?.aborted) return { activated: false, reason: "cancelled" };
      const bytes = new Uint8Array(await staged.arrayBuffer());
      if (
        toHex(await digest(CryptoDigestAlgorithm.SHA256, bytes)) !==
        manifest.sha256.toLowerCase()
      )
        return { activated: false, reason: "integrity" };
      if (
        !(await this.verifier.verify(bytes, manifest.signature, manifest.keyId))
      )
        return { activated: false, reason: "signature" };
      if (!(await this.activate(staged, manifest)))
        return { activated: false, reason: "health-check" };
      return { activated: true, version: manifest.vocabularyVersion };
    } catch {
      return { activated: false, reason: "download" };
    } finally {
      if (staged.exists) staged.delete();
    }
  }
}
function isSecureDownloadUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
function toHex(value: ArrayBuffer) {
  return [...new Uint8Array(value)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
function safeVersion(value: string) {
  return value.replace(/[^a-z0-9._-]/gi, "-");
}
function compareVersions(left: string, right: string) {
  const a = left.split(".").map(Number),
    b = right.split(".").map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}
