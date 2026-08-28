import type {
  EntityRelation,
  EntityType,
  ExternalTranscriptPreparation,
  VoiceEntityRepository,
} from "@/types";
import { DEFAULT_VOICE_RESOLVER_CONFIG } from "@/constants/voice-resolver";
import { decideResolution, rankEntityCandidates } from "@/utils/voice/matching/candidate-ranker";
import { parseUtterance } from "@/utils/voice/matching/semantic-parser";
import { normalizeVoiceText, voiceTokens } from "@/utils/voice/normalize";
import {
  containsVoicePhrase,
  replaceVoicePhrase,
} from "@/utils/voice/transcript-preparation";
import { voiceTermRepository } from "./voice-repository";

export class ExternalTranscriptPreparer {
  constructor(
    private readonly repository: VoiceEntityRepository = voiceTermRepository,
  ) {}

  async prepare(
    transcript: string,
    signal?: AbortSignal,
  ): Promise<ExternalTranscriptPreparation> {
    const originalTranscript = transcript.trim();
    const parsed = parseUtterance(originalTranscript);
    let preparedTranscript = parsed.normalized;
    const corrections: ExternalTranscriptPreparation["corrections"] = [];
    if (!preparedTranscript || signal?.aborted) {
      return { originalTranscript, preparedTranscript, corrections };
    }

    const relationByText = new Map<string, { types?: EntityType[]; relation?: EntityRelation }>();
    for (const relation of parsed.relations) {
      relationByText.set(relation.span.text, {
        types: relation.expectedTypes,
        relation: relation.relation,
      });
    }
    const windows = [...parsed.contentWindows]
      .filter(
        (window, index, all) =>
          all.findIndex((candidate) => candidate.text === window.text) === index,
      )
      .sort(
        (left, right) =>
          voiceTokens(right.text).length - voiceTokens(left.text).length,
      )
      .slice(0, DEFAULT_VOICE_RESOLVER_CONFIG.limits.maxWindows);

    for (const window of windows) {
      if (signal?.aborted) break;
      const normalizedWindow = normalizeVoiceText(window.text);
      if (
        !normalizedWindow ||
        !containsVoicePhrase(preparedTranscript, normalizedWindow)
      ) {
        continue;
      }
      const relation = relationByText.get(window.text);
      try {
        const rarity = await this.repository.getTokenRarity(
          voiceTokens(normalizedWindow),
        );
        const candidates = await this.repository.searchEntities({
          text: normalizedWindow,
          normalizedText: normalizedWindow,
          expectedTypes: relation?.types,
          limit: DEFAULT_VOICE_RESOLVER_CONFIG.limits.fts,
          context: { relation: relation?.relation },
        });
        const ranked = rankEntityCandidates(candidates, {
          config: DEFAULT_VOICE_RESOLVER_CONFIG,
          expectedTypes: relation?.types,
          relation: relation?.relation,
          rarity,
          queryTokens: voiceTokens(normalizedWindow),
        });
        const decision = decideResolution(
          ranked,
          DEFAULT_VOICE_RESOLVER_CONFIG,
        );
        if (decision.kind !== "resolved") continue;
        const strongEnough =
          decision.candidate.scores.exact === 1 ||
          (voiceTokens(normalizedWindow).length >= 2 &&
            decision.candidate.confidence >=
              DEFAULT_VOICE_RESOLVER_CONFIG.resolvedThreshold);
        if (!strongEnough) continue;
        const canonical = decision.candidate.canonicalName.replace(/^#+/, "").trim();
        if (!canonical) continue;
        const replacedTranscript = replaceVoicePhrase(
          preparedTranscript,
          normalizedWindow,
          canonical,
        );
        if (replacedTranscript === preparedTranscript) continue;
        preparedTranscript = replacedTranscript;
        if (normalizeVoiceText(canonical) !== normalizedWindow) {
          corrections.push({
            original: window.text,
            canonical,
            entityType: decision.candidate.entityType,
          });
        }
      } catch {
        continue;
      }
    }

    return { originalTranscript, preparedTranscript, corrections };
  }
}

export const externalTranscriptPreparer = new ExternalTranscriptPreparer();
