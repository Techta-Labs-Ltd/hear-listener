import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AccessibilityProvider } from "./AccessibilityProvider";
import { FirebaseAuthProvider } from "./FirebaseAuthProvider";
import { VoiceProvider } from "./VoiceProvider";
import { NotificationProvider } from "./NotificationProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AccessibilityProvider>
        <FirebaseAuthProvider>
          <VoiceProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </VoiceProvider>
        </FirebaseAuthProvider>
      </AccessibilityProvider>
    </GestureHandlerRootView>
  );
}
