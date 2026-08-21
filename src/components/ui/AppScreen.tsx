import { useCallback, useRef } from "react";
import { useFocusEffect, usePathname } from "expo-router";
import { SafeAreaView, View } from "@/tw";
import type { AppScreenProps } from "@/types";
import { useVoice } from "@/hooks/useVoice";
import { useAppAccessibility } from "@/providers/AccessibilityProvider";
import { getVoiceScreenDefinition } from "@/services/voice/screen-registry";
import {
  SCREEN_IDLE_HINTS,
  SCREEN_IDLE_TIMEOUT,
} from "@/constants/screen-hints";

export function AppScreen({
  children,
  style,
  screenTitle,
  screenOrientation,
  screenReadout,
  voiceCommands,
  ...props
}: AppScreenProps) {
  const pathname = usePathname();
  const voice = useVoice();
  const accessibility = useAppAccessibility();
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const screenId = (() => {
    try {
      return getVoiceScreenDefinition(pathname).id;
    } catch {
      return undefined;
    }
  })();

  useFocusEffect(
    useCallback(() => {
      const cleanup = voice.registerScreen?.({
        id: screenId,
        pathname,
        title: screenTitle,
        orientation: screenOrientation,
        readout: screenReadout,
        commands: voiceCommands,
        voiceEnabled: true,
      });

      if (screenOrientation) {
        accessibility.announce(screenOrientation, `screen:${pathname}`, true);
      }

      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        const hint = SCREEN_IDLE_HINTS[pathname] || SCREEN_IDLE_HINTS["/"];
        if (hint && voice.state === "idle") {
          accessibility.announce(hint, `idle:${pathname}`, true);
        }
      }, SCREEN_IDLE_TIMEOUT);

      return () => {
        if (idleTimer.current) clearTimeout(idleTimer.current);
        accessibility.stopSpeaking();
        cleanup?.();
      };
    }, [
      accessibility,
      pathname,
      screenId,
      screenOrientation,
      screenReadout,
      screenTitle,
      voice,
      voiceCommands,
    ]),
  );

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <View
        className="w-full max-w-[720px] flex-1 self-center"
        style={style}
        {...props}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
