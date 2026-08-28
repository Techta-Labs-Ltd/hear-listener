import type { LocalRoutingResult, PendingRouterContext } from "@/types";
import {
  AMBIGUITY_REPEAT_PHRASES,
  AMBIGUITY_SELECTION_LEFT_PHRASES,
  AMBIGUITY_SELECTION_RIGHT_PHRASES,
  AMBIGUITY_SELECT_CURRENT_PHRASES,
  AMBIGUITY_SELECT_PHRASES,
  FEEDBACK_DISCARD_PHRASES,
  FEEDBACK_ENTRY_PHRASES,
  FEEDBACK_RATING_BY_PHRASE,
  FEEDBACK_SUBMIT_PHRASES,
} from "@/constants/voice-interactions";
import { ambiguityController } from "./ambiguity-controller";
import { feedbackVoiceController } from "./feedback-controller";
import { voiceAnnounce } from "./speech-coordinator";

export class PendingInteractionRouter {
  route(
    transcript: string,
    normalized: string,
    context: PendingRouterContext = {},
  ): LocalRoutingResult | undefined {
    const pendingAmbiguity = ambiguityController.getPending();
    const feedbackTarget = feedbackVoiceController.getTarget();

    if (
      (pendingAmbiguity || feedbackTarget) &&
      (normalized === "cancel" ||
        normalized === "never mind" ||
        normalized === "forget it")
    ) {
      ambiguityController.clear();
      feedbackVoiceController.clear();
      return undefined;
    }

    if (feedbackTarget) {
      return this.routeFeedback(normalized);
    }

    if (pendingAmbiguity) {
      return this.routeAmbiguity(normalized);
    }

    if (FEEDBACK_ENTRY_PHRASES.has(normalized)) {
      const current = context.playback?.current;
      if (!current) return undefined;
      feedbackVoiceController.startFeedback({
        kind: "track",
        trackId: current.id,
        playbackSessionId: "playback",
      });
      return {
        kind: "feedback",
        prompt:
          "You can give feedback on this audio. Say a rating from one to five, or say good or bad, then say send.",
      };
    }

    return undefined;
  }

  private routeAmbiguity(normalized: string): LocalRoutingResult | undefined {
    if (AMBIGUITY_SELECTION_LEFT_PHRASES.has(normalized)) {
      ambiguityController.previous();
      return { kind: "selected" };
    }
    if (AMBIGUITY_SELECTION_RIGHT_PHRASES.has(normalized)) {
      ambiguityController.next();
      return { kind: "selected" };
    }
    if (AMBIGUITY_REPEAT_PHRASES.has(normalized)) {
      this.announceOptions();
      return { kind: "selected" };
    }
    if (AMBIGUITY_SELECT_PHRASES.has(normalized)) {
      const selected =
        ambiguityController.selectByTranscript(normalized) ??
        (AMBIGUITY_SELECT_CURRENT_PHRASES.has(normalized)
          ? ambiguityController.confirm()
          : undefined);
      if (selected?.invocation) {
        ambiguityController.clear();
        return { kind: "execute", invocation: selected.invocation };
      }
    }
    return undefined;
  }

  private routeFeedback(normalized: string): LocalRoutingResult | undefined {
    if (FEEDBACK_SUBMIT_PHRASES.has(normalized)) {
      const current = feedbackVoiceController.getRating();
      if (current === undefined) {
        void voiceAnnounce(
          "No rating selected yet. Say a number from one to five.",
        );
      } else {
        void feedbackVoiceController.submitFeedback().then((result) => {
          void voiceAnnounce(result.message);
        });
      }
      return { kind: "selected" };
    }
    if (FEEDBACK_DISCARD_PHRASES.has(normalized)) {
      feedbackVoiceController.clear();
      void voiceAnnounce("Feedback cancelled.");
      return { kind: "selected" };
    }
    if (normalized === "repeat" || normalized === "repeat the rating") {
      const rating = feedbackVoiceController.getRating();
      void voiceAnnounce(
        rating === undefined
          ? "No rating selected yet."
          : `Current rating: ${rating} out of five.`,
      );
      return { kind: "selected" };
    }
    const rating = FEEDBACK_RATING_BY_PHRASE[normalized];
    if (rating !== undefined) {
      feedbackVoiceController.setRating(rating);
      void voiceAnnounce(`Rating ${rating} out of five. Say send when ready.`);
      return { kind: "selected" };
    }
    return undefined;
  }

  private announceOptions(): void {
    const pending = ambiguityController.getPending();
    if (!pending || !pending.alternatives.length) return;
    const current = pending.alternatives[pending.selectedIndex];
    const index = pending.selectedIndex + 1;
    void voiceAnnounce(
      `${current.label}, option ${index} of ${pending.alternatives.length}.`,
    );
  }
}

export const pendingInteractionRouter = new PendingInteractionRouter();
