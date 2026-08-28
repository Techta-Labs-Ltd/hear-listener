import type {
  ExternalInteractionContext,
  ExternalInteractionTransition,
  ExternalResolverResponse,
  PendingExternalInteraction,
  VoiceChoice,
} from "@/types";
import {
  EXTERNAL_CHOICE_ORDINALS,
  EXTERNAL_CONFIRMATION_NO_PHRASES,
  EXTERNAL_CONFIRMATION_YES_PHRASES,
  EXTERNAL_INTERACTION_COPY,
  EXTERNAL_INTERACTION_REPEAT_PHRASES,
  EXTERNAL_INTERACTION_TTL_MS,
} from "@/constants/external-voice";
import { normalizeVoiceText } from "./normalize";

export function createPendingExternalInteraction(
  response: ExternalResolverResponse,
  context: ExternalInteractionContext,
  now = Date.now(),
): PendingExternalInteraction | undefined {
  if (response.kind !== "ambiguity" && response.kind !== "confirmation") {
    return undefined;
  }

  const choices: VoiceChoice[] =
    response.kind === "ambiguity"
      ? response.choices.map((choice) => ({
          id: `external:${choice.id}`,
          label: choice.label,
          detail: choice.detail,
          externalCandidateId: choice.id,
          externalAction: { kind: "select", candidateId: choice.id },
        }))
      : [
          {
            id: "external:confirm:yes",
            label: "Yes",
            externalAction: { kind: "confirm", approved: true },
          },
          {
            id: "external:confirm:no",
            label: "No",
            externalAction: { kind: "confirm", approved: false },
          },
        ];

  return {
    phase: response.kind,
    interactionToken: response.interactionToken,
    voiceSessionId: context.voiceSessionId,
    installationId: context.installationId,
    prompt: response.prompt,
    choices,
    expiresAt: parseExpiry(response.expiresAt, now),
    invalidAttempts: 0,
    resumePlaybackOnCancel: context.resumePlaybackOnCancel === true,
  };
}

export function transitionExternalInteraction(
  pending: PendingExternalInteraction,
  transcript: string,
): ExternalInteractionTransition {
  const normalized = normalizeVoiceText(transcript);
  if (includesPhrase(EXTERNAL_CONFIRMATION_NO_PHRASES, normalized)) {
    return { decision: { kind: "cancel" }, pending };
  }
  if (includesPhrase(EXTERNAL_INTERACTION_REPEAT_PHRASES, normalized)) {
    return {
      decision: {
        kind: "repeat",
        prompt: pending.prompt,
        choices: pending.choices,
      },
      pending,
    };
  }
  if (
    pending.phase === "confirmation" &&
    includesPhrase(EXTERNAL_CONFIRMATION_YES_PHRASES, normalized)
  ) {
    return { decision: { kind: "confirm" }, pending };
  }
  if (pending.phase === "ambiguity") {
    const ordinal = EXTERNAL_CHOICE_ORDINALS[normalized];
    const ordinalChoice =
      ordinal === undefined ? undefined : pending.choices[ordinal];
    if (ordinalChoice?.externalCandidateId) {
      return {
        decision: {
          kind: "select",
          candidateId: ordinalChoice.externalCandidateId,
        },
        pending,
      };
    }
    const exactChoice = pending.choices.find(
      (choice) => normalizeVoiceText(choice.label) === normalized,
    );
    const partialChoices =
      normalized.length < 3
        ? []
        : pending.choices.filter((choice) =>
            normalizeVoiceText(choice.label).includes(normalized),
          );
    const labelChoice = exactChoice ??
      (partialChoices.length === 1 ? partialChoices[0] : undefined);
    if (labelChoice?.externalCandidateId) {
      return {
        decision: {
          kind: "select",
          candidateId: labelChoice.externalCandidateId,
        },
        pending,
      };
    }
  }

  const invalidAttempts = pending.invalidAttempts + 1;
  if (invalidAttempts === 1) {
    const nextPending = { ...pending, invalidAttempts };
    return {
      decision: {
        kind: "invalid",
        prompt: invalidInteractionPrompt(pending),
        choices: pending.choices,
      },
      pending: nextPending,
    };
  }
  return { decision: { kind: "cancel" } };
}

function parseExpiry(expiresAt: string | undefined, now: number): number {
  const parsed = expiresAt ? Date.parse(expiresAt) : NaN;
  const fiveMinutes = now + EXTERNAL_INTERACTION_TTL_MS;
  return Number.isFinite(parsed) ? Math.min(parsed, fiveMinutes) : fiveMinutes;
}

function invalidInteractionPrompt(pending: PendingExternalInteraction): string {
  const hint =
    pending.phase === "confirmation"
      ? EXTERNAL_INTERACTION_COPY.confirmationAnswerHint
      : EXTERNAL_INTERACTION_COPY.ambiguityAnswerHint;
  return `${pending.prompt} ${hint}`;
}

function includesPhrase(
  phrases: readonly string[],
  normalized: string,
): boolean {
  return phrases.includes(normalized);
}
