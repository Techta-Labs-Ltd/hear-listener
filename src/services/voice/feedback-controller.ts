import { useFeedbackVoiceStore } from "@/stores/feedback-voice-store";
import type { FeedbackTarget } from "@/types";
import { requestLedger } from "./request-ledger";

export class FeedbackVoiceController {
  startFeedback(target: FeedbackTarget): void {
    useFeedbackVoiceStore.getState().startFeedback(target);
  }

  getTarget(): FeedbackTarget | undefined {
    return useFeedbackVoiceStore.getState().activeTarget;
  }

  setRating(rating: number): void {
    useFeedbackVoiceStore.getState().setRating(rating);
  }

  getRating(): number | undefined {
    return useFeedbackVoiceStore.getState().pendingRating;
  }

  getDedupeKey(userId = "anonymous"): string {
    const target = this.getTarget();
    if (!target) return "";
    const targetId =
      target.kind === "track" ? target.trackId : target.publicationId;
    return `${userId}:${target.playbackSessionId}:${target.kind}:${targetId}`;
  }

  async submitFeedback(
    userId = "anonymous",
  ): Promise<{ ok: boolean; message: string }> {
    const target = this.getTarget();
    if (!target) {
      return { ok: false, message: "No active feedback target." };
    }

    const dedupeKey = this.getDedupeKey(userId);
    if (requestLedger.isCompleted(dedupeKey)) {
      return { ok: true, message: "Feedback already submitted." };
    }

    const now = Date.now();
    requestLedger.record({
      requestId: `feedback_${now}`,
      sessionId: target.playbackSessionId,
      idempotencyKey: dedupeKey,
      origin: {
        screenId: "player",
        instanceId: "inst",
        stateVersion: 1,
        routeKey: "/player",
      },
      actionId: "feedback_submit",
      status: "completed",
      startedAt: now,
      completedAt: now,
    });
    useFeedbackVoiceStore.getState().clearFeedback();

    return { ok: true, message: "Thank you for your feedback." };
  }

  clear(): void {
    useFeedbackVoiceStore.getState().clearFeedback();
  }
}

export const feedbackVoiceController = new FeedbackVoiceController();
