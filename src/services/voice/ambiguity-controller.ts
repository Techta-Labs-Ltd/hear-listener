import { voiceAnnounce } from "./speech-coordinator";
import { appHaptics } from "@/lib/haptics";
import type { PendingAmbiguity, VoiceChoice, VoiceInvocation } from "@/types";

export class AmbiguityController {
  private pending?: PendingAmbiguity;

  public setAmbiguity(
    sessionId: string,
    requestId: string,
    choices: VoiceChoice[],
    invocations?: VoiceInvocation[],
  ): PendingAmbiguity {
    const now = Date.now();
    this.pending = {
      interactionId: `ambiguity_${now}`,
      sessionId,
      requestId,
      alternatives: choices.map((c, idx) => ({
        id: c.id,
        label: c.label,
        choice: c,
        invocation: invocations?.[idx],
      })),
      selectedIndex: 0,
      createdAt: now,
      expiresAt: now + 30000,
    };
    return this.pending;
  }

  public getPending(): PendingAmbiguity | undefined {
    if (!this.pending) return undefined;
    if (Date.now() > this.pending.expiresAt) {
      this.pending = undefined;
      return undefined;
    }
    return this.pending;
  }

  public next(): PendingAmbiguity | undefined {
    if (!this.pending || this.pending.alternatives.length === 0) return undefined;
    this.pending.selectedIndex =
      (this.pending.selectedIndex + 1) % this.pending.alternatives.length;
    this.announceCurrent();
    void appHaptics.selection();
    return this.pending;
  }

  public previous(): PendingAmbiguity | undefined {
    if (!this.pending || this.pending.alternatives.length === 0) return undefined;
    this.pending.selectedIndex =
      (this.pending.selectedIndex - 1 + this.pending.alternatives.length) %
      this.pending.alternatives.length;
    this.announceCurrent();
    void appHaptics.selection();
    return this.pending;
  }

  public confirm(): { id: string; label: string; choice?: VoiceChoice; invocation?: VoiceInvocation } | undefined {
    const p = this.getPending();
    if (!p || p.alternatives.length === 0) return undefined;
    const selected = p.alternatives[p.selectedIndex];
    this.pending = undefined;
    return selected;
  }

  public clear(): void {
    this.pending = undefined;
  }

  private announceCurrent(): void {
    if (!this.pending) return;
    const current = this.pending.alternatives[this.pending.selectedIndex];
    const total = this.pending.alternatives.length;
    const index = this.pending.selectedIndex + 1;
    void voiceAnnounce(`${current.label}, option ${index} of ${total}.`);
  }
}

export const ambiguityController = new AmbiguityController();
