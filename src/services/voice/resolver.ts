import type {
  EntityRelation,
  EntityType,
  ParsedUtterance,
  RankedEntityCandidate,
  ResolverConfig,
  SemanticAction,
  SemanticModifiers,
  VoiceChoice,
  VoiceCommand,
  VoiceEvidence,
  VoiceInvocation,
  VoiceResolution,
  VoiceResolveRequest,
  VoiceResolver,
  VoiceSlots,
  VoiceEntityRepository,
} from "@/types";
import { voiceTermRepository } from "./repository";
import { defaultResolverConfig } from "./matching/resolver-config";
import {
  decideResolution,
  rankEntityCandidates,
} from "./matching/candidate-ranker";
import { parseUtterance } from "./matching/semantic-parser";
import { makeInvocation } from "./matching/invocation";

export class SQLiteVoiceResolver implements VoiceResolver {
  constructor(
    private readonly repository: VoiceEntityRepository = voiceTermRepository,
    private readonly config: ResolverConfig = defaultResolverConfig,
  ) {}

  async resolve(request: VoiceResolveRequest): Promise<VoiceResolution> {
    if (request.signal?.aborted) return { kind: "cancelled", confidence: 0 };

    const hypotheses = request.hypotheses?.length
      ? request.hypotheses
      : [{ transcript: "", confidence: 0.8, rank: 0 }];

    let lastUnrecognized: VoiceResolution | undefined;
    for (const hypothesis of hypotheses.slice(0, 5)) {
      if (request.signal?.aborted) return { kind: "cancelled", confidence: 0 };
      const result = await this.resolveTranscript(
        hypothesis.transcript,
        request,
      );
      if (result.kind === "invocation" || result.kind === "choices") {
        return result;
      }
      if (result.kind === "unrecognized") lastUnrecognized = result;
    }
    return (
      lastUnrecognized ?? {
        kind: "unrecognized",
        confidence: 0,
        reason: "no-match",
      }
    );
  }

  private async resolveTranscript(
    transcript: string,
    request: VoiceResolveRequest,
  ): Promise<VoiceResolution> {
    const parsed = parseUtterance(transcript);
    if (!hasSemanticContent(parsed)) {
      return { kind: "unrecognized", confidence: 0, reason: "no-command" };
    }
    if (!(await this.repository.isReady())) {
      return {
        kind: "unrecognized",
        confidence: 0,
        reason: "index-unavailable",
      };
    }

    const claimed: RankedEntityCandidate[] = [];
    let locationCandidate: RankedEntityCandidate | undefined;

    if (parsed.relations.length) {
      for (const relation of parsed.relations) {
        const spanResult = await this.resolveSpan(
          relation.span.text,
          relation.expectedTypes,
          relation.relation,
          parsed,
          request,
        );
        if (spanResult.kind === "choices") return spanResult.result;
        if (spanResult.kind === "resolved") {
          if (spanResult.candidate.entityType === "location") {
            locationCandidate = spanResult.candidate;
          } else {
            claimed.push(spanResult.candidate);
          }
        }
      }
    } else {
      for (const window of parsed.contentWindows) {
        const spanResult = await this.resolveSpan(
          window.text,
          undefined,
          undefined,
          parsed,
          request,
        );
        if (spanResult.kind === "choices") return spanResult.result;
        if (spanResult.kind === "resolved") {
          if (spanResult.candidate.entityType === "location") {
            locationCandidate = spanResult.candidate;
          } else {
            claimed.push(spanResult.candidate);
          }
          break;
        }
      }
    }

    if (!claimed.length && !locationCandidate) {
      return (
        this.modifierOnlyInvocation(parsed, request) ?? {
          kind: "unrecognized",
          confidence: 0,
          reason: "no-candidate",
        }
      );
    }

    const primary =
      claimed.sort((left, right) => right.confidence - left.confidence)[0] ??
      locationCandidate;
    if (!primary) {
      return { kind: "unrecognized", confidence: 0, reason: "no-candidate" };
    }

    const invocation = this.buildInvocation(
      parsed.action,
      parsed.modifiers,
      primary,
      locationCandidate,
      request,
    );
    if (!invocation) {
      return {
        kind: "unrecognized",
        confidence: primary.confidence,
        reason: "weak-confidence",
      };
    }
    return { kind: "invocation", invocation };
  }

  private async resolveSpan(
    text: string,
    expectedTypes: EntityType[] | undefined,
    relation: EntityRelation | undefined,
    parsed: ParsedUtterance,
    request: VoiceResolveRequest,
  ): Promise<
    | { kind: "resolved"; candidate: RankedEntityCandidate }
    | { kind: "choices"; result: VoiceResolution }
    | { kind: "none" }
  > {
    const tokens = text.split(" ").filter(Boolean);
    const rarity = await this.repository
      .getTokenRarity(tokens)
      .catch(() => ({}));
    const candidates = await this.repository.searchEntities({
      text,
      normalizedText: text,
      expectedTypes,
      limit: this.config.limits.fts,
      context: {
        relation,
        screenId: request.context.screenId,
      },
    });
    if (!candidates.length) return { kind: "none" };
    const ranked = rankEntityCandidates(candidates, {
      config: this.config,
      expectedTypes,
      relation,
      rarity,
      queryTokens: tokens,
    });
    const decision = decideResolution(ranked, this.config);
    if (decision.kind === "resolved") {
      return { kind: "resolved", candidate: decision.candidate };
    }
    if (decision.kind === "ambiguous") {
      return {
        kind: "choices",
        result: this.buildChoices(
          decision.candidates,
          parsed.action,
          parsed.modifiers,
          request,
        ),
      };
    }
    return { kind: "none" };
  }

  private buildChoices(
    candidates: RankedEntityCandidate[],
    action: SemanticAction,
    modifiers: SemanticModifiers,
    request: VoiceResolveRequest,
  ): VoiceResolution {
    const choices: VoiceChoice[] = [];
    for (const candidate of candidates) {
      const invocation = this.buildInvocation(
        action,
        modifiers,
        candidate,
        candidate.entityType === "location" ? candidate : undefined,
        request,
      );
      if (!invocation) continue;
      choices.push({
        id: invocation.idempotencyKey,
        label: candidate.canonicalName,
        detail: `${Math.round(candidate.confidence * 100)}% match`,
        invocation,
        command: invocation.command,
        alias: request.hypotheses[0]?.transcript,
      });
    }
    if (!choices.length) {
      return { kind: "unrecognized", confidence: 0, reason: "no-candidate" };
    }
    return {
      kind: "choices",
      prompt: "I found a few possible matches. Which one did you mean?",
      choices,
      confidence: candidates[0].confidence,
      recognitionSessionId: request.sessionId,
    };
  }

  private modifierOnlyInvocation(
    parsed: ParsedUtterance,
    request: VoiceResolveRequest,
  ): VoiceResolution | undefined {
    if (
      parsed.action === "none" ||
      parsed.action === "follow" ||
      parsed.action === "unfollow"
    ) {
      return undefined;
    }
    const mode = modeForModifiers(parsed.modifiers);
    if (!mode) return undefined;
    const invocation = makeInvocation({
      sessionId: request.sessionId,
      actionId: `play:${mode}`,
      executorKey: "play",
      command: { type: "play", mode },
      slots: {},
      confidence: 0.9,
      evidence: [],
      risk: "safe",
      requiresConfirmation: false,
    });
    return { kind: "invocation", invocation };
  }

  private buildInvocation(
    action: SemanticAction,
    modifiers: SemanticModifiers,
    primary: RankedEntityCandidate,
    locationCandidate: RankedEntityCandidate | undefined,
    request: VoiceResolveRequest,
  ): VoiceInvocation | undefined {
    const candidate = primary;
    const metadata = candidate.metadata ?? {};
    const storyIds = Array.isArray(metadata.storyIds)
      ? (metadata.storyIds as string[])
      : [];
    const type = candidate.entityType;
    const evidence: VoiceEvidence[] = [
      {
        source: evidenceSource(candidate.matchMethod),
        score: candidate.confidence,
        matchedText: candidate.matchedAlias ?? candidate.canonicalName,
      },
    ];

    if (type === "story") {
      return makeInvocation({
        sessionId: request.sessionId,
        actionId: "play:story",
        executorKey: "play",
        command: { type: "play", mode: "story", storyId: candidate.entityId },
        slots: { storyId: candidate.entityId },
        confidence: candidate.confidence,
        evidence,
        risk: "safe",
        requiresConfirmation: false,
      });
    }

    if (type === "location") {
      const onboarding =
        request.context.currentPath === "/onboarding" ||
        request.context.screenId === "onboarding";
      if (onboarding) {
        return makeInvocation({
          sessionId: request.sessionId,
          actionId: "onboardingSetTown",
          executorKey: "onboardingSetTown",
          command: {
            type: "onboardingSetTown",
            locationId: candidate.entityId,
            name: candidate.canonicalName,
          },
          slots: {
            locationId: candidate.entityId,
            locationName: candidate.canonicalName,
          },
          confidence: candidate.confidence,
          evidence,
          risk: "privacy",
          requiresConfirmation: true,
        });
      }
      if (action === "play" || action === "find") {
        return makeInvocation({
          sessionId: request.sessionId,
          actionId: "play:local",
          executorKey: "play",
          command: {
            type: "play",
            mode: "local",
            locationId: candidate.entityId,
          },
          slots: {
            locationId: candidate.entityId,
            locationName: candidate.canonicalName,
          },
          confidence: candidate.confidence,
          evidence,
          risk: "safe",
          requiresConfirmation: false,
        });
      }
      return makeInvocation({
        sessionId: request.sessionId,
        actionId: "setLocation",
        executorKey: "setLocation",
        command: {
          type: "setLocation",
          locationId: candidate.entityId,
          name: candidate.canonicalName,
        },
        slots: {
          locationId: candidate.entityId,
          locationName: candidate.canonicalName,
        },
        confidence: candidate.confidence,
        evidence,
        risk: "privacy",
        requiresConfirmation: true,
      });
    }

    if (type === "category" || type === "tag") {
      const openTopic = action === "find";
      const command: VoiceCommand = openTopic
        ? { type: "openTopic", topicId: candidate.entityId }
        : { type: "play", mode: "latest", topicId: candidate.entityId };
      return makeInvocation({
        sessionId: request.sessionId,
        actionId: openTopic ? "openTopic" : "play:latest",
        executorKey: openTopic ? "openTopic" : "play",
        command,
        slots: { topicId: candidate.entityId },
        confidence: candidate.confidence,
        evidence,
        risk: "safe",
        requiresConfirmation: false,
      });
    }

    if (action === "follow" || action === "unfollow") {
      return makeInvocation({
        sessionId: request.sessionId,
        actionId: action,
        executorKey: action,
        command: { type: action, entityId: candidate.entityId },
        slots: {
          entityId: candidate.entityId,
          entityType: type,
          entityName: candidate.canonicalName,
        },
        confidence: candidate.confidence,
        evidence,
        risk: action === "unfollow" ? "destructive" : "safe",
        requiresConfirmation: action === "unfollow",
      });
    }

    const slots: VoiceSlots = {
      entityId: candidate.entityId,
      entityType: type,
      entityName: candidate.canonicalName,
    };
    if (locationCandidate) {
      slots.locationId = locationCandidate.entityId;
      slots.locationName = locationCandidate.canonicalName;
    }

    if (modifiers.latest) {
      return makeInvocation({
        sessionId: request.sessionId,
        actionId: "play:latest",
        executorKey: "play",
        command: {
          type: "play",
          mode: "latest",
          entityId: candidate.entityId,
          entityType: playEntityType(type),
          entityName: candidate.canonicalName,
          locationId: locationCandidate?.entityId,
        },
        slots,
        confidence: candidate.confidence,
        evidence,
        risk: "safe",
        requiresConfirmation: false,
      });
    }

    if (storyIds.length) {
      return makeInvocation({
        sessionId: request.sessionId,
        actionId: "play:story",
        executorKey: "play",
        command: {
          type: "play",
          mode: "story",
          storyId: storyIds[0],
          entityId: candidate.entityId,
          entityType: playEntityType(type),
          entityName: candidate.canonicalName,
        },
        slots: { ...slots, storyId: storyIds[0] },
        confidence: candidate.confidence,
        evidence,
        risk: "safe",
        requiresConfirmation: false,
      });
    }

    return makeInvocation({
      sessionId: request.sessionId,
      actionId: "play:entity",
      executorKey: "play",
      command: {
        type: "play",
        mode: "entity",
        entityId: candidate.entityId,
        entityType: playEntityType(type),
        entityName: candidate.canonicalName,
      },
      slots,
      confidence: candidate.confidence,
      evidence,
      risk: "safe",
      requiresConfirmation: false,
    });
  }
}

function playEntityType(
  type: EntityType,
): Extract<VoiceCommand, { type: "play" }>["entityType"] {
  switch (type) {
    case "organization":
    case "publication":
    case "creator":
    case "category":
      return type;
    default:
      return "publication";
  }
}

function modeForModifiers(modifiers: SemanticModifiers) {
  if (modifiers.latest) return "latest" as const;
  if (modifiers.local) return "local" as const;
  if (modifiers.recommended) return "recommended" as const;
  if (modifiers.trending) return "trending" as const;
  if (modifiers.saved) return "saved" as const;
  if (modifiers.downloads) return "downloads" as const;
  return undefined;
}

function hasSemanticContent(parsed: ParsedUtterance): boolean {
  return (
    parsed.action !== "none" ||
    parsed.contentWindows.length > 0 ||
    parsed.relations.length > 0 ||
    parsed.residual.length > 0
  );
}

function evidenceSource(
  method: RankedEntityCandidate["matchMethod"],
): VoiceEvidence["source"] {
  switch (method) {
    case "exact":
      return "exact";
    case "fts":
      return "fts";
    case "trigram":
      return "trigram";
    case "phonetic":
      return "phonetic";
    default:
      return "generic";
  }
}

export const voiceResolver: VoiceResolver = new SQLiteVoiceResolver();
