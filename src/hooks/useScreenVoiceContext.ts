import { useEffect, useRef } from "react";
import { useVoice } from "./useVoice";
import type { ScreenVoiceCapability, VoiceScreenId } from "@/types";

export function useScreenVoiceCapability(capability: ScreenVoiceCapability) {
  const { registerScreen } = useVoice();
  const instanceIdRef = useRef<string | undefined>(capability.instanceId || undefined);

  useEffect(() => {
    if (!registerScreen) return;
    if (!instanceIdRef.current) {
      instanceIdRef.current = `screen_${Date.now()}`;
    }
    const cleanup = registerScreen({
      id: (capability.screenId as VoiceScreenId) ?? "unknown",
      pathname: capability.routeKey,
      title: capability.title,
      commands: capability.localCommands,
      orientation: capability.title,
      readout: capability.readout,
      recognitionExpectation: capability.recognitionExpectation,
      screenState: {
        phase: capability.phase,
        stateVersion: capability.stateVersion,
        instanceId: instanceIdRef.current,
      },
      voiceEnabled: capability.voiceEnabled,
      resolverContext: capability.resolverContext,
      localCommands: capability.localCommands,
    });
    return cleanup;
  }, [
    capability.screenId,
    capability.routeKey,
    capability.title,
    capability.phase,
    capability.stateVersion,
    capability.voiceEnabled,
    capability.localCommands,
    capability.readout,
    capability.recognitionExpectation,
    capability.resolverContext,
    registerScreen,
  ]);
}
