import { createContext, useContext, useEffect } from "react";
import type { ScreenVoiceContext, VoiceContextValue } from "@/types";

export const VoiceContext = createContext<VoiceContextValue | undefined>(
  undefined,
);

export function useVoice(): VoiceContextValue {
  const voice = useContext(VoiceContext);
  if (!voice) throw new Error("useVoice must be used inside VoiceProvider");
  return voice;
}

export function useRegisterScreenVoice(screen: ScreenVoiceContext): void {
  const { registerScreen } = useVoice();
  useEffect(() => {
    return registerScreen?.(screen);
  }, [registerScreen, screen]);
}
