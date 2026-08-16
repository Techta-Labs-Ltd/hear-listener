import { useContext } from "react";
import { VoiceContext } from "@/providers/voice-context";

export function useVoice() {
  const voice = useContext(VoiceContext);
  if (!voice) throw new Error("useVoice must be used inside VoiceProvider");
  return voice;
}
