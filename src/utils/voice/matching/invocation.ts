import type {
  VoiceCommand,
  VoiceEvidence,
  VoiceInvocation,
  VoiceRisk,
  VoiceSlots,
} from "@/types";

type VoiceInvocationInput = {
  sessionId: string;
  actionId: string;
  executorKey: VoiceInvocation["executorKey"];
  command: VoiceCommand;
  slots?: VoiceSlots;
  confidence?: number;
  evidence?: VoiceEvidence[];
  risk?: VoiceRisk;
  requiresConfirmation?: boolean;
};

export function makeInvocation(input: VoiceInvocationInput): VoiceInvocation {
  const slots = input.slots ?? {};
  const idempotencyKey = `${input.sessionId}:${input.actionId}:${JSON.stringify(slots)}`;
  return {
    actionId: input.actionId,
    executorKey: input.executorKey,
    command: input.command,
    slots,
    confidence: Math.max(0, Math.min(0.99, input.confidence ?? 0.98)),
    evidence: input.evidence ?? [],
    alternatives: [],
    recognitionSessionId: input.sessionId,
    databaseVersion: 7,
    risk: input.risk ?? "safe",
    requiresConfirmation: input.requiresConfirmation ?? false,
    idempotencyKey,
  };
}
