import { appHaptics } from "@/lib/haptics";
import { useAmbiguityStore } from "@/stores/ambiguity-store";
import type {
  AmbiguitySelection,
  PendingAmbiguity,
  VoiceChoice,
  VoiceInvocation,
} from "@/types";
import { voiceAnnounce } from "./speech-coordinator";

export class AmbiguityController {
  setAmbiguity(
    sessionId: string,
    requestId: string,
    choices: VoiceChoice[],
    invocations?: VoiceInvocation[],
  ): PendingAmbiguity {
    return useAmbiguityStore
      .getState()
      .setAmbiguity(sessionId, requestId, choices, invocations);
  }

  getPending(): PendingAmbiguity | undefined {
    return useAmbiguityStore.getState().getPending();
  }

  next(): PendingAmbiguity | undefined {
    const pending = useAmbiguityStore.getState().moveSelection(1);
    this.announceSelection(pending);
    return pending;
  }

  previous(): PendingAmbiguity | undefined {
    const pending = useAmbiguityStore.getState().moveSelection(-1);
    this.announceSelection(pending);
    return pending;
  }

  selectIndex(index: number): AmbiguitySelection | undefined {
    return useAmbiguityStore.getState().selectIndex(index);
  }

  confirm(): AmbiguitySelection | undefined {
    return useAmbiguityStore.getState().confirmSelection();
  }

  selectByTranscript(transcript: string): AmbiguitySelection | undefined {
    return useAmbiguityStore.getState().selectByTranscript(transcript);
  }

  clear(): void {
    useAmbiguityStore.getState().clearAmbiguity();
  }

  private announceSelection(pending?: PendingAmbiguity): void {
    if (!pending) return;
    const current = pending.alternatives[pending.selectedIndex];
    if (!current) return;
    const index = pending.selectedIndex + 1;
    void voiceAnnounce(
      `${current.label}, option ${index} of ${pending.alternatives.length}.`,
    );
    void appHaptics.selection();
  }
}

export const ambiguityController = new AmbiguityController();
