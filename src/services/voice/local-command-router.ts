import { usePreferencesStore } from "@/stores/preferences-store";
import type {
  LocalRoutingResult,
  ScreenVoiceCapability,
  VoiceHypothesis
} from "@/types";
import { voiceResolver } from "./resolver";

export class LocalCommandRouter {
  public async route(
    sessionId: string,
    hypotheses: VoiceHypothesis[],
    screenSnapshot?: ScreenVoiceCapability | null,
    context?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<LocalRoutingResult> {
    const transcript = hypotheses[0]?.transcript?.trim() ?? "";
    if (!transcript) {
      return { kind: "unrecognised", reason: "no-speech" };
    }

    const preferences = usePreferencesStore.getState();

    const localResult = await voiceResolver.resolve({
      sessionId,
      hypotheses,
      signal,
      context: {
        screenId: screenSnapshot?.screenId ?? "unknown",
        currentPath: screenSnapshot?.routeKey ?? "/",
        pathname: screenSnapshot?.routeKey ?? "/",
        preferences,
        stories: [],
        topics: [],
        entities: [],
        ...context,
      },
    });

    if (localResult.kind === "invocation") {
      return { kind: "execute", invocation: localResult.invocation };
    }

    if (localResult.kind === "choices") {
      return {
        kind: "ambiguity",
        prompt: localResult.prompt,
        choices: localResult.choices,
      };
    }

    if (localResult.kind === "cancelled") {
      return { kind: "cancelled" };
    }

    return { kind: "remote", transcript };
  }
}

export const localCommandRouter = new LocalCommandRouter();
