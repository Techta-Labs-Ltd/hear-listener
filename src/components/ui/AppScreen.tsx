import { useCallback, useEffect, useRef } from "react";
import { useFocusEffect, usePathname } from "expo-router";
import { SafeAreaView, View } from "@/tw";
import type { AppScreenProps, ScreenVoiceContext } from "@/types";
import { useVoice } from "@/hooks/useVoice";
import { useAppAccessibility } from "@/providers/AccessibilityProvider";
import { speechCoordinator } from "@/services/voice/speech-coordinator";
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
  const isFocusedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);
  const lastAnnouncedOrientationRef = useRef<string | undefined>(undefined);
  const idleTimer1 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const idleTimer2 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const screenId = (() => {
    try {
      return getVoiceScreenDefinition(pathname).id;
    } catch {
      return undefined;
    }
  })();

  const screenContextRef = useRef<ScreenVoiceContext>({
    id: screenId,
    pathname,
    title: screenTitle,
    orientation: screenOrientation,
    readout: screenReadout,
    commands: voiceCommands,
    voiceEnabled: true,
  });

  useEffect(() => {
    screenContextRef.current = {
      id: screenId,
      pathname,
      title: screenTitle,
      orientation: screenOrientation,
      readout: screenReadout,
      commands: voiceCommands,
      voiceEnabled: true,
    };
    if (isFocusedRef.current && registerScreen) {
      cleanupRef.current?.();
      cleanupRef.current = registerScreen(screenContextRef.current);
    }
  }, [
    registerScreen,
    screenId,
    pathname,
    screenTitle,
    screenOrientation,
    screenReadout,
    voiceCommands,
  ]);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      const ctx = screenContextRef.current;
      const pathKey = ctx.pathname || "/";
      cleanupRef.current = registerScreen?.(ctx);

      if (ctx.orientation && lastAnnouncedOrientationRef.current !== ctx.orientation) {
        lastAnnouncedOrientationRef.current = ctx.orientation;
        accessibility.announce(ctx.orientation, `screen:${pathKey}`, true);
      }

      if (idleTimer1.current) clearTimeout(idleTimer1.current);
      if (idleTimer2.current) clearTimeout(idleTimer2.current);

      idleTimer1.current = setTimeout(() => {
        if (speechCoordinator.isQuiet()) return;
        const hint1 = SCREEN_IDLE_HINTS[pathKey] || SCREEN_IDLE_HINTS["/"];
        if (hint1) {
          accessibility.announce(hint1, `idle1:${pathKey}`, true);
        }
      }, SCREEN_IDLE_TIMEOUT_1);

      idleTimer2.current = setTimeout(() => {
        if (speechCoordinator.isQuiet()) return;
        const hint2 = SCREEN_IDLE_HINTS_2[pathKey] || SCREEN_IDLE_HINTS_2["/"];
        if (hint2) {
          accessibility.announce(hint2, `idle2:${pathKey}`, true);
        }
      }, SCREEN_IDLE_TIMEOUT_2);

      return () => {
        isFocusedRef.current = false;
        lastAnnouncedOrientationRef.current = undefined;
        if (idleTimer1.current) clearTimeout(idleTimer1.current);
        if (idleTimer2.current) clearTimeout(idleTimer2.current);
        idleTimer1.current = undefined;
        idleTimer2.current = undefined;
        accessibility.stopSpeaking();
        cleanupRef.current?.();
        cleanupRef.current = undefined;
      };
    }, [accessibility, registerScreen]),
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
