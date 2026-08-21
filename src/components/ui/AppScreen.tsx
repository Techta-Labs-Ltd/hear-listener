import { useCallback, useRef } from "react";
import { useFocusEffect, usePathname } from "expo-router";
import { SafeAreaView, View } from "@/tw";
import type { AppScreenProps } from "@/types";
import { useVoice } from "@/hooks/useVoice";
import { useAppAccessibility } from "@/providers/AccessibilityProvider";
import { getVoiceScreenDefinition } from "@/services/voice/screen-registry";
import {
  SCREEN_IDLE_HINTS,
  SCREEN_IDLE_HINTS_2,
  SCREEN_IDLE_TIMEOUT_1,
  SCREEN_IDLE_TIMEOUT_2,
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
  const registerScreen = voice.registerScreen;
  const accessibility = useAppAccessibility();
  const idleTimer1 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const idleTimer2 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const screenId = (() => {
    try {
      return getVoiceScreenDefinition(pathname).id;
    } catch {
      return undefined;
    }
  })();

  useFocusEffect(
    useCallback(() => {
      const cleanup = registerScreen?.({
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

      if (idleTimer1.current) clearTimeout(idleTimer1.current);
      if (idleTimer2.current) clearTimeout(idleTimer2.current);

      idleTimer1.current = setTimeout(() => {
        const hint1 = SCREEN_IDLE_HINTS[pathname] || SCREEN_IDLE_HINTS["/"];
        if (hint1) {
          accessibility.announce(hint1, `idle1:${pathname}`, true);
        }
      }, SCREEN_IDLE_TIMEOUT_1);

      idleTimer2.current = setTimeout(() => {
        const hint2 = SCREEN_IDLE_HINTS_2[pathname] || SCREEN_IDLE_HINTS_2["/"];
        if (hint2) {
          accessibility.announce(hint2, `idle2:${pathname}`, true);
        }
      }, SCREEN_IDLE_TIMEOUT_2);

      return () => {
        if (idleTimer1.current) clearTimeout(idleTimer1.current);
        if (idleTimer2.current) clearTimeout(idleTimer2.current);
        idleTimer1.current = undefined;
        idleTimer2.current = undefined;
        accessibility.stopSpeaking();
        cleanup?.();
      };
    }, [
      accessibility,
      pathname,
      registerScreen,
      screenId,
      screenOrientation,
      screenReadout,
      screenTitle,
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
