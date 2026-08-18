import type {
  SpeedMultiplier,
  VoiceCandidate,
  VoiceCommand,
  VoiceExecutorKey,
  VoiceInvocation,
  VoiceResolution,
  VoiceResolveRequest,
  VoiceResolver,
  VoiceTermRepository,
} from "@/types";
import { normalizeVoiceText, voiceTokens } from "./normalize";
import { voiceTermRepository } from "./repository";
import { scoreVoiceCandidate } from "./score";

const HIGH_CONFIDENCE = 0.79;
const MIN_MARGIN = 0.07;
const MEDIUM_CONFIDENCE = 0.48;

export class SQLiteVoiceResolver implements VoiceResolver {
  constructor(
    private readonly repository: VoiceTermRepository = voiceTermRepository,
  ) {}
  async resolve(request: VoiceResolveRequest): Promise<VoiceResolution> {
    if (request.signal?.aborted) return { kind: "cancelled", confidence: 0 };
    const version = this.repository.getVersion
      ? await this.repository.getVersion()
      : 0;
    const collected: (VoiceCandidate & {
      score: number;
      hypothesis: string;
    })[] = [];
    for (const hypothesis of request.hypotheses.slice(0, 5)) {
      const normalized = normalizeVoiceText(hypothesis.transcript);
      const candidates = await this.repository.search(
        normalized,
        16,
        request.signal,
      );
      if (request.signal?.aborted) return { kind: "cancelled", confidence: 0 };
      for (const candidate of candidates) {
        const textScore = candidateScore(normalized, candidate);
        const asrConfidence =
          hypothesis.confidence < 0 ? 0.8 : hypothesis.confidence;
        collected.push({
          ...candidate,
          hypothesis: normalized,
          score: Math.min(
            0.99,
            textScore * 0.86 +
              asrConfidence * 0.1 +
              Math.max(0, 0.04 - hypothesis.rank * 0.01),
          ),
        });
      }
    }
    const ranked = bestPerTarget(collected).sort(
      (left, right) => right.score - left.score,
    );
    const onOnboarding = request.context.currentPath === "/onboarding";
    const actions = ranked
      .map((item) => {
        const onboardingAction =
          item.kind === "action" &&
          (item.targetId ?? "").startsWith("onboarding");
        if (onboardingAction)
          return {
            ...item,
            score: Math.min(
              0.99,
              item.score * (onOnboarding ? 1.18 : 0.82),
            ),
          };
        return item;
      })
      .filter((item) => item.kind === "action")
      .sort((left, right) => right.score - left.score);
    const action = actions[0] ?? inferEntityAction(ranked);
    if (!action || action.score < MEDIUM_CONFIDENCE)
      return {
        kind: "unrecognized",
        confidence: action?.score ?? 0,
        reason: "No registered action matched",
      };
    const invocation = createInvocation(action, ranked, request, version);
    if (!invocation)
      return {
        kind: "unrecognized",
        confidence: action.score,
        reason: "The matched action had invalid or incomplete slots",
      };
    const next = actions.find((item) => item.targetId !== action.targetId);
    const ambiguous =
      action.score < HIGH_CONFIDENCE ||
      (!!next && action.score - next.score < MIN_MARGIN);
    if (!ambiguous && !invocation.requiresConfirmation)
      return { kind: "invocation", invocation };
    const choices = [
      action,
      ...actions.filter((item) => item.targetId !== action.targetId),
    ]
      .slice(0, 3)
      .map((candidate) => createInvocation(candidate, ranked, request, version))
      .filter((item): item is VoiceInvocation => !!item)
      .map((item) => ({
        id: item.idempotencyKey,
        label: labelFor(item),
        detail: `${Math.round(item.confidence * 100)}% match`,
        invocation: item,
        command: item.command,
        alias: request.hypotheses[0]?.transcript,
      }));
    return choices.length
      ? {
          kind: "choices",
          prompt: invocation.requiresConfirmation
            ? `Confirm ${labelFor(invocation)}.`
            : "I found a few possible matches. Which one did you mean?",
          choices,
          confidence: action.score,
        }
      : { kind: "unrecognized", confidence: action.score };
  }
}

function candidateScore(query: string, candidate: VoiceCandidate) {
  if (query === candidate.normalized) return 1;
  const base = scoreVoiceCandidate(
    query,
    candidate.normalized,
    candidate.weight,
  );
  const coverage =
    voiceTokens(candidate.normalized).filter((token) =>
      voiceTokens(query).includes(token),
    ).length / Math.max(voiceTokens(candidate.normalized).length, 1);
  const sourceBoost =
    candidate.source === "exact"
      ? 0.18
      : candidate.source === "fts"
        ? 0.08
        : candidate.source === "phonetic"
          ? 0.05
          : 0;
  return Math.min(0.99, base * 0.72 + coverage * 0.2 + sourceBoost);
}
function bestPerTarget<T extends VoiceCandidate & { score: number }>(
  items: T[],
) {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = `${item.kind}:${item.targetId ?? item.id}`;
    if (!map.get(key) || map.get(key)!.score < item.score) map.set(key, item);
  }
  return [...map.values()];
}
function inferEntityAction(
  ranked: (VoiceCandidate & { score: number; hypothesis: string })[],
) {
  const entity = ranked.find((item) =>
    ["story", "topic", "entity", "location"].includes(item.kind),
  );
  if (!entity) return undefined;
  return {
    ...entity,
    kind: "action" as const,
    targetId:
      entity.kind === "story"
        ? "play:story"
        : entity.kind === "topic"
          ? "openTopic"
          : entity.kind === "entity"
            ? "follow"
            : "setLocation",
    executorKey: (entity.kind === "story"
      ? "play"
      : entity.kind === "topic"
        ? "openTopic"
        : entity.kind === "entity"
          ? "follow"
          : "setLocation") as VoiceExecutorKey,
    score: entity.score * 0.88,
  };
}
function createInvocation(
  action: VoiceCandidate & { score: number; hypothesis: string },
  ranked: (VoiceCandidate & { score: number; hypothesis: string })[],
  request: VoiceResolveRequest,
  version: number,
): VoiceInvocation | undefined {
  const actionId = action.targetId ?? "";
  const executorKey = (action.executorKey ??
    actionId.split(":")[0]) as VoiceExecutorKey;
  const topic = ranked.find(
    (item) => item.kind === "topic" && item.score >= 0.4,
  );
  const location = ranked.find(
    (item) => item.kind === "location" && item.score >= 0.4,
  );
  const story = ranked.find(
    (item) => item.kind === "story" && item.score >= 0.45,
  );
  const entity = ranked.find(
    (item) => item.kind === "entity" && item.score >= 0.45,
  );
  const command = commandFor(
    actionId,
    executorKey,
    { topic, location, story, entity },
    action.hypothesis,
  );
  if (!command) return undefined;
  const risk =
    action.risk ??
    (executorKey === "setLocation"
      ? "privacy"
      : ["clearQueue", "removeSaved", "removeDownload", "unfollow"].includes(
            executorKey,
          )
        ? "destructive"
        : "safe");
  const slots: Record<string, string | number | boolean | undefined> = {
    topicId: topic?.targetId ?? undefined,
    locationId: location?.targetId ?? undefined,
    locationName: location?.canonical,
    storyId: story?.targetId ?? undefined,
    entityId: entity?.targetId ?? undefined,
  };
  const idempotencyKey = `${request.sessionId}:${actionId}:${JSON.stringify(slots)}`;
  return {
    actionId,
    executorKey,
    command,
    slots,
    confidence: action.score,
    evidence: [
      {
        source: action.source ?? "fts",
        termId: action.id,
        score: action.score,
        matchedText: action.normalized,
      },
    ],
    alternatives: [],
    recognitionSessionId: request.sessionId,
    databaseVersion: version,
    risk,
    requiresConfirmation:
      action.confirmation === 1 || risk === "destructive" || risk === "privacy",
    idempotencyKey,
  };
}
function commandFor(
  actionId: string,
  key: VoiceExecutorKey,
  slots: {
    topic?: VoiceCandidate;
    location?: VoiceCandidate;
    story?: VoiceCandidate;
    entity?: VoiceCandidate;
  },
  query: string,
): VoiceCommand | undefined {
  const value = actionId.split(":")[1];
  if (key === "navigate")
    return {
      type: "navigate",
      target: (value ?? "home") as Extract<
        VoiceCommand,
        { type: "navigate" }
      >["target"],
    };
  if (key === "play")
    return {
      type: "play",
      mode: (value ?? (slots.story ? "story" : "latest")) as Extract<
        VoiceCommand,
        { type: "play" }
      >["mode"],
      storyId: slots.story?.targetId ?? undefined,
      topicId: slots.topic?.targetId ?? undefined,
      locationId: slots.location?.targetId ?? undefined,
    };
  if (key === "openTopic" && slots.topic?.targetId)
    return { type: "openTopic", topicId: slots.topic.targetId };
  if (key === "setLocation" && slots.location?.targetId)
    return {
      type: "setLocation",
      locationId: slots.location.targetId,
      name: slots.location.canonical,
    };
  if (key === "onboardingSetTown" && slots.location?.targetId)
    return {
      type: "onboardingSetTown",
      locationId: slots.location.targetId,
      name: slots.location.canonical,
    };
  if ((key === "follow" || key === "unfollow") && slots.entity?.targetId)
    return { type: key, entityId: slots.entity.targetId };
  if (key === "seek")
    return {
      type: "seek",
      direction: value === "backward" ? "backward" : "forward",
      seconds: numberFrom(query, 15),
    };
  if (key === "sleepTimer")
    return { type: "sleepTimer", minutes: numberFrom(query, 20) };
  if (key === "speed")
    return { type: "speed", multiplier: validSpeed(Number(value)) };
  if (key === "speedStep")
    return { type: "speedStep", direction: value === "down" ? "down" : "up" };
  if (key === "repeat")
    return { type: "repeat", mode: value === "off" ? "off" : "on" };
  if (key === "openLibrarySection")
    return {
      type: "openLibrarySection",
      section: (value ?? "saved") as Extract<
        VoiceCommand,
        { type: "openLibrarySection" }
      >["section"],
    };
  if (key === "search") return { type: "search", query };
  return { type: key } as VoiceCommand;
}
function numberFrom(value: string, fallback: number) {
  return Number(value.match(/\b(\d{1,3})\b/)?.[1] ?? fallback);
}
function validSpeed(value: number): SpeedMultiplier {
  return ([0.75, 1, 1.25, 1.5, 2] as SpeedMultiplier[]).includes(
    value as SpeedMultiplier,
  )
    ? (value as SpeedMultiplier)
    : 1;
}
function labelFor(item: VoiceInvocation) {
  return item.actionId.replaceAll(":", " ");
}
export const voiceResolver: VoiceResolver = new SQLiteVoiceResolver();
