import type {
  PreparedAsrHypothesis,
  VoiceHypothesis,
} from "@/types";
import { WholeWordProfanityFilter } from "./profanity-filter";
import { stripSafeFillers } from "./transcript-preparation";

export function prepareAsrHypotheses(
  hypotheses: VoiceHypothesis[],
  protectedPhrases: string[] = [],
): PreparedAsrHypothesis[] {
  const filter = new WholeWordProfanityFilter(protectedPhrases);
  return hypotheses.map((hypothesis, rank) => {
    const cleaned = filter.sanitize(hypothesis.transcript, "remove");
    const fillerCleaned = stripSafeFillers(cleaned.sanitized, protectedPhrases);
    return {
      rawTranscript: hypothesis.transcript,
      sanitizedTranscript: fillerCleaned.sanitized,
      confidence:
        hypothesis.confidence < 0 ? undefined : hypothesis.confidence,
      rank: hypothesis.rank ?? rank,
    };
  });
}

export function sanitizedHypotheses(
  prepared: PreparedAsrHypothesis[],
): VoiceHypothesis[] {
  return prepared.map((item) => ({
    transcript: item.sanitizedTranscript,
    confidence: item.confidence ?? 0.8,
    rank: item.rank,
  }));
}
