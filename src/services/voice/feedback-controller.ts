import { requestLedger } from "./request-ledger";
import type { FeedbackTarget } from "@/types";

export class FeedbackVoiceController {
  private activeTarget?: FeedbackTarget;
  private pendingRating?: number;

  public startFeedback(target: FeedbackTarget): void {
    this.activeTarget = target;
    this.pendingRating = undefined;
  }

  public getTarget(): FeedbackTarget | undefined {
    return this.activeTarget;
  }

  public setRating(rating: number): void {
    this.pendingRating = rating;
  }

  public getDedupeKey(userId = "anonymous"): string {
    if (!this.activeTarget) return "";
    const targetId =
      this.activeTarget.kind === "track"
        ? this.activeTarget.trackId
        : this.activeTarget.publicationId;
    return `${userId}:${this.activeTarget.playbackSessionId}:${this.activeTarget.kind}:${targetId}`;
  }

  public async submitFeedback(userId = "anonymous"): Promise<{ ok: boolean; message: string }> {
    if (!this.activeTarget) {
      return { ok: false, message: "No active feedback target." };
    }

    const dedupeKey = this.getDedupeKey(userId);
    if (requestLedger.isCompleted(dedupeKey)) {
      return { ok: true, message: "Feedback already submitted." };
    }

    const receipt = {
      requestId: `feedback_${Date.now()}`,
      sessionId: this.activeTarget.playbackSessionId,
      idempotencyKey: dedupeKey,
      origin: {
        screenId: "player",
        instanceId: "inst",
        stateVersion: 1,
        routeKey: "/player",
      },
      actionId: "feedback_submit",
      status: "completed" as const,
      startedAt: Date.now(),
      completedAt: Date.now(),
    };

    requestLedger.record(receipt);
    this.activeTarget = undefined;
    this.pendingRating = undefined;

    return { ok: true, message: "Thank you for your feedback." };
  }

  public clear(): void {
    this.activeTarget = undefined;
    this.pendingRating = undefined;
  }
}

export const feedbackVoiceController = new FeedbackVoiceController();
