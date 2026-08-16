import type { File } from "expo-file-system";

export type VoicePackManifest = {
  manifestVersion: 1;
  vocabularyVersion: string;
  schemaVersion: number;
  minimumAppVersion: string;
  createdAt: string;
  sha256: string;
  signature: string;
  keyId: string;
  downloadUrl: string;
  attribution: string;
};

export interface VoicePackSignatureVerifier {
  verify(
    payload: Uint8Array,
    signature: string,
    keyId: string,
  ): Promise<boolean>;
}

export type VoicePackResult = {
  activated: boolean;
  reason?:
    | "cancelled"
    | "disabled"
    | "incompatible"
    | "integrity"
    | "signature"
    | "health-check"
    | "download";
  version?: string;
};

export type VoicePackActivator = (
  staged: File,
  manifest: VoicePackManifest,
) => Promise<boolean>;
