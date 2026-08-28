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
      if (feedbackTarget) {
        return {
          kind: "feedback",
          prompt: "Feedback cancelled.",
          resumePlaybackOnClose:
            feedbackTarget.resumePlaybackOnClose === true,
        };
      }
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
      const playbackSessionId =
        context.playback?.playbackSessionId || "playback";
      const resumePlaybackOnClose = context.playbackWasPlaying === true;
      if (
        context.playback?.queueMode === "publication" &&
        current.publicationId
      ) {
        feedbackVoiceController.startFeedback({
          kind: "publication",
          publicationId: current.publicationId,
          playbackSessionId,
          listenedTrackIds:
            context.playback.queue?.map((item) => item.id) ?? [current.id],
          resumePlaybackOnClose,
        });
      } else {
        feedbackVoiceController.startFeedback({
          kind: "track",
          trackId: current.id,
          publicationId: current.publicationId,
          playbackSessionId,
          resumePlaybackOnClose,
        });
      }
      return {
        kind: "feedback",
        prompt:
          "You can give feedback on this audio. Say a rating from one to five, or say good or bad, then say send.",
        reopenListening: true,
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
    const target = feedbackVoiceController.getTarget();
    const resumePlaybackOnClose = target?.resumePlaybackOnClose === true;
    if (FEEDBACK_SUBMIT_PHRASES.has(normalized)) {
      const current = feedbackVoiceController.getRating();
      if (current === undefined) {
        return {
          kind: "feedback",
          prompt: "No rating selected yet. Say a number from one to five.",
          reopenListening: true,
        };
      }
      void feedbackVoiceController.submitFeedback();
      return {
        kind: "feedback",
        prompt: "Thank you for your feedback.",
        resumePlaybackOnClose,
      };
    }
    if (FEEDBACK_DISCARD_PHRASES.has(normalized)) {
      feedbackVoiceController.clear();
      return {
        kind: "feedback",
        prompt: "Feedback cancelled.",
        resumePlaybackOnClose,
      };
    }
    if (normalized === "repeat" || normalized === "repeat the rating") {
      const rating = feedbackVoiceController.getRating();
      return {
        kind: "feedback",
        prompt:
          rating === undefined
          ? "No rating selected yet."
          : `Current rating: ${rating} out of five.`,
        reopenListening: true,
      };
    }
    const rating = FEEDBACK_RATING_BY_PHRASE[normalized];
    if (rating !== undefined) {
      feedbackVoiceController.setRating(rating);
      return {
        kind: "feedback",
        prompt: `Rating ${rating} out of five. Say send when ready.`,
        reopenListening: true,
      };
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
