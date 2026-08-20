import type {
  VoiceEventListener,
  VoiceInvocationSource,
  VoiceTriggerEvent,
} from "@/types";

class VoiceEventEmitter {
  private listeners = new Set<VoiceEventListener>();

  subscribe(listener: VoiceEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  trigger(
    source: VoiceInvocationSource = "eventTrigger",
    announceLocation = true,
  ): void {
    const event: VoiceTriggerEvent = { source, announceLocation };
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

export const voiceEvents = new VoiceEventEmitter();

export function triggerVoice(
  source?: VoiceInvocationSource,
  announceLocation?: boolean,
): void {
  voiceEvents.trigger(source, announceLocation);
}
