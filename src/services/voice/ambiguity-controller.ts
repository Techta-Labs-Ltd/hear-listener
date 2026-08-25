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
      alternatives: choices.map((c, idx) => {
        const invocation = invocations?.[idx];
        const slots = invocation?.slots ?? {};
        const entityType =
          (slots.entityType as PendingAmbiguity["alternatives"][number]["entityType"]) ??
          (slots.storyId
            ? "story"
            : slots.topicId
              ? "category"
              : slots.locationId
                ? "location"
                : undefined);
        const entityId =
          (slots.entityId as string | undefined) ??
          (slots.storyId as string | undefined) ??
          (slots.topicId as string | undefined) ??
          (slots.locationId as string | undefined);
        return {
          id: c.id,
          label: c.label,
          choice: c,
          invocation,
          entityId,
          entityType,
          canonicalName:
            (slots.entityName as string | undefined) ??
            (slots.locationName as string | undefined) ??
            c.label,
          score: invocation?.confidence,
        };
      }),
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

  public selectIndex(index: number): { id: string; label: string; choice?: VoiceChoice; invocation?: VoiceInvocation } | undefined {
    const p = this.getPending();
    if (!p || index < 0 || index >= p.alternatives.length) return undefined;
    p.selectedIndex = index;
    return this.confirm();
  }

  public confirm(): { id: string; label: string; choice?: VoiceChoice; invocation?: VoiceInvocation } | undefined {
    const p = this.getPending();
    if (!p || !p.alternatives.length) return undefined;
    const current = p.alternatives[p.selectedIndex];
    if (!current) return undefined;
    return {
      id: current.id,
      label: current.label,
      choice: current.choice,
      invocation: current.invocation,
    };
  }

  public selectByTranscript(
    transcript: string,
  ): { id: string; label: string; choice?: VoiceChoice; invocation?: VoiceInvocation } | undefined {
    const p = this.getPending();
    if (!p || p.alternatives.length === 0) return undefined;

    const lower = transcript.toLowerCase().trim();

    // Check ordinal & number matches
    const ordinalMap: Record<string, number> = {
      first: 0,
      "1st": 0,
      "1": 0,
      one: 0,
      "option 1": 0,
      "number 1": 0,
      "number one": 0,
      second: 1,
      "2nd": 1,
      "2": 1,
      two: 1,
      "option 2": 1,
      "number 2": 1,
      "number two": 1,
      third: 2,
      "3rd": 2,
      "3": 2,
      three: 2,
      "option 3": 2,
      "number 3": 2,
      "number three": 2,
      fourth: 3,
      "4th": 3,
      "4": 3,
      four: 3,
      "option 4": 3,
      "number 4": 3,
      "number four": 3,
    };

    if (ordinalMap[lower] !== undefined && ordinalMap[lower] < p.alternatives.length) {
      return this.selectIndex(ordinalMap[lower]);
    }

    // Check label matching
    const matchIndex = p.alternatives.findIndex((alt) =>
      alt.label.toLowerCase().includes(lower) || lower.includes(alt.label.toLowerCase()),
    );
    if (matchIndex >= 0) {
      return this.selectIndex(matchIndex);
    }

    return undefined;
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
