import type { LocalRoutingResult, PendingRouterContext } from "@/types";
import { ambiguityController } from "./ambiguity-controller";
import { feedbackVoiceController } from "./feedback-controller";
import { voiceAnnounce } from "./speech-coordinator";

const SELECTION_LEFT = new Set([
  "left",
  "previous",
  "previous option",
  "go left",
  "last one",
  "previous one",
]);

const SELECTION_RIGHT = new Set([
  "right",
  "next",
  "next option",
  "go right",
]);

const REPEAT_OPTIONS = new Set([
  "repeat",
  "repeat options",
  "repeat the options",
  "what are my options",
  "what were the options",
  "say them again",
  "say the options again",
]);

const SELECT_PHRASES = new Set([
  "select",
  "choose",
  "choose it",
  "choose this",
  "choose this one",
  "that one",
  "this one",
  "it",
  "yes",
  "confirm",
  "first one",
  "the first one",
  "first",
  "second one",
  "the second one",
  "second",
  "third one",
  "the third one",
  "third",
  "fourth one",
  "the fourth one",
  "fourth",
  "one",
  "two",
  "three",
  "four",
  "five",
  "1",
  "2",
  "3",
  "4",
  "5",
  "option 1",
  "option 2",
  "option 3",
  "option 4",
  "option 5",
  "option one",
  "option two",
  "option three",
  "option four",
  "option five",
  "number 1",
  "number 2",
  "number 3",
  "number 4",
  "number 5",
  "number one",
  "number two",
  "number three",
  "number four",
  "number five",
]);

const SELECT_CURRENT = new Set([
  "select",
  "choose",
  "choose it",
  "choose this",
  "choose this one",
  "that one",
  "this one",
  "it",
  "yes",
  "confirm",
]);

const RATING_MAP: Record<string, number> = {
  "1": 1,
  one: 1,
  bad: 1,
  awful: 1,
  terrible: 1,
  poor: 1,
  "2": 2,
  two: 2,
  "3": 3,
  three: 3,
  okay: 3,
  "4": 4,
  four: 4,
  good: 4,
  "5": 5,
  five: 5,
  great: 5,
  excellent: 5,
  brilliant: 5,
};

const FEEDBACK_ENTRY = new Set([
  "give feedback",
  "feedback",
  "feedback on this",
  "feedback on this track",
  "feedback on this publication",
  "i want to leave feedback",
  "leave feedback",
  "rate this",
]);

const FEEDBACK_SUBMIT = new Set(["yes", "submit", "send it", "send"]);
const FEEDBACK_DISCARD = new Set(["no", "never mind", "forget it"]);

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

    if (FEEDBACK_ENTRY.has(normalized)) {
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
    if (SELECTION_LEFT.has(normalized)) {
      ambiguityController.previous();
      return { kind: "selected" };
    }
    if (SELECTION_RIGHT.has(normalized)) {
      ambiguityController.next();
      return { kind: "selected" };
    }
    if (REPEAT_OPTIONS.has(normalized)) {
      this.announceOptions();
      return { kind: "selected" };
    }
    if (SELECT_PHRASES.has(normalized)) {
      const selected =
        ambiguityController.selectByTranscript(normalized) ??
        (SELECT_CURRENT.has(normalized)
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
    if (FEEDBACK_SUBMIT.has(normalized)) {
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
    if (FEEDBACK_DISCARD.has(normalized)) {
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
    const rating = RATING_MAP[normalized];
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
