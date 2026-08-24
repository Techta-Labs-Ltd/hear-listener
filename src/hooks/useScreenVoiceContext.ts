import { useEffect, useRef } from "react";
import { useVoice } from "./useVoice";
import type { ScreenVoiceCapability, VoiceScreenId } from "@/types";

export function useScreenVoiceCapability(capability: ScreenVoiceCapability) {
  const { registerScreen } = useVoice();
  const instanceIdRef = useRef(capability.instanceId || `screen_${Date.now()}`);

  useEffect(() => {
    if (!registerScreen) return;
    const cleanup = registerScreen({
      id: (capability.screenId as VoiceScreenId) ?? "unknown",
      pathname: capability.routeKey,
      title: capability.title,
      commands: capability.localCommands,
      orientation: capability.title,
      readout: capability.readout,
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
    registerScreen,
  ]);
}
