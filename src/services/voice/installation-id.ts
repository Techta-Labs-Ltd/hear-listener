import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { VOICE_INSTALLATION_ID_KEY } from "@/constants/external-voice";
import type { InstallationIdStorage } from "@/types";


export class VoiceInstallationIdentity {
  private installationIdPromise: Promise<string> | undefined;
  private sessionFallbackId: string | undefined;

  constructor(
    private readonly storage: InstallationIdStorage,
    private readonly createId: () => string,
  ) {}

  get(): Promise<string> {
    this.installationIdPromise ??= this.loadOrCreate();
    return this.installationIdPromise;
  }

  resetForTests(): void {
    this.installationIdPromise = undefined;
    this.sessionFallbackId = undefined;
  }

  private async loadOrCreate(): Promise<string> {
    try {
      const existing = await this.storage.getItemAsync(
        VOICE_INSTALLATION_ID_KEY,
      );
      if (existing?.trim()) return existing;
      const created = this.createId();
      await this.storage.setItemAsync(VOICE_INSTALLATION_ID_KEY, created);
      return created;
    } catch {
      this.sessionFallbackId ??= this.createId();
      return this.sessionFallbackId;
    }
  }
}

const voiceInstallationIdentity = new VoiceInstallationIdentity(
  SecureStore,
  () => Crypto.randomUUID(),
);

export function getVoiceInstallationId(): Promise<string> {
  return voiceInstallationIdentity.get();
}

export function resetVoiceInstallationIdForTests(): void {
  voiceInstallationIdentity.resetForTests();
}
