import type { VoiceDiagnostic, VoiceDiagnostics } from "@/types";

class NoopVoiceDiagnostics implements VoiceDiagnostics {
  async record(_event: VoiceDiagnostic) {}
  async reset() {}
  async export() {
    return [];
  }
}

export const voiceDiagnostics: VoiceDiagnostics = new NoopVoiceDiagnostics();
