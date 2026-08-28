import type {
  LocalRoutingResult,
  PendingRouterContext,
  ScreenVoiceCapability,
  VoiceHypothesis,
} from "@/types";
import {
  isPlaybackSpeedIntent,
  matchLocalCommand,
} from "@/utils/voice/local-command-matcher";
import { normalizeVoiceText } from "@/utils/voice/normalize";
import { externalTranscriptPreparer } from "./external-transcript-preparer";
import { pendingInteractionRouter } from "./pending-interaction-router";

export class LocalCommandRouter {
  async route(
    sessionId: string,
    hypotheses: VoiceHypothesis[],
    screenSnapshot?: ScreenVoiceCapability | null,
    context?: Record<string, unknown>,
    signal?: AbortSignal,
    allowExternal = true,
  ): Promise<LocalRoutingResult> {
    const transcript = hypotheses[0]?.transcript?.trim() ?? "";
    if (!transcript) {
      return { kind: "unrecognised", reason: "no-speech" };
    }

    const pending = pendingInteractionRouter.route(
      transcript,
      normalizeVoiceText(transcript),
      context as PendingRouterContext,
    );
    if (pending) return pending;

    for (const hypothesis of hypotheses.slice(0, 5)) {
      const local = matchLocalCommand(
        normalizeVoiceText(hypothesis.transcript),
        sessionId,
        screenSnapshot,
        context,
      );
      if (local) return { kind: "execute", invocation: local };
    }

    const requestedUnsupportedSpeed = hypotheses
      .slice(0, 5)
      .some((hypothesis) =>
        isPlaybackSpeedIntent(normalizeVoiceText(hypothesis.transcript)),
      );
    if (requestedUnsupportedSpeed) {
      return {
        kind: "feedback",
        prompt:
          "Say a playback speed: half, three quarters, normal, one point two five, one and a half, or double.",
      };
    }

    if (!allowExternal) {
      return { kind: "unrecognised", reason: "no-local-match" };
    }

    const prepared = await externalTranscriptPreparer.prepare(
      transcript,
      signal,
    );
    if (signal?.aborted) return { kind: "cancelled" };
    return {
      kind: "remote",
      originalTranscript: prepared.originalTranscript,
      preparedTranscript: prepared.preparedTranscript,
    };
  }
}

export const localCommandRouter = new LocalCommandRouter();
