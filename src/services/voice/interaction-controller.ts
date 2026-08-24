import { useVoiceStore } from "@/stores/voice-store";
import { ambiguityController } from "./ambiguity-controller";
import type { InteractionEvent } from "@/types";
import { voiceSessionEngine } from "./voice-session-engine";

export class InteractionController {
  public async handle(event: InteractionEvent): Promise<void> {
    const voiceState = useVoiceStore.getState();

    switch (event.type) {
      case "VOICE_INVOKE": {
        const isBusy =
          voiceState.state === "listening" ||
          voiceState.state === "executing" ||
          voiceState.state === "preparing" ||
          voiceState.externalResolving;

        if (!isBusy) {
          ambiguityController.clear();
          await voiceSessionEngine.invoke(event.source);
        }
        break;
      }

      case "CANCEL": {
        ambiguityController.clear();
        voiceSessionEngine.cancel(event.source);
        break;
      }

      case "SELECT_PREVIOUS": {
        if (voiceState.state === "clarifying") {
          ambiguityController.previous();
        }
        break;
      }

      case "SELECT_NEXT": {
        if (voiceState.state === "clarifying") {
          ambiguityController.next();
        }
        break;
      }

      case "CONFIRM_SELECTION": {
        if (voiceState.state === "clarifying") {
          const selected = ambiguityController.confirm();
          if (selected) {
            useVoiceStore.getState().resetVoice();
          }
        }
        break;
      }
    }
  }
}

export const interactionController = new InteractionController();
