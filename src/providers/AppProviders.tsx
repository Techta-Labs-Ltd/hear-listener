import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AccessibilityProvider } from "./AccessibilityProvider";
import { FirebaseAuthProvider } from "./FirebaseAuthProvider";
import { VoiceProvider } from "./VoiceProvider";
import { NotificationProvider } from "./NotificationProvider";
import { KineticProvider } from "./KineticProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AccessibilityProvider>
        <FirebaseAuthProvider>
          <KineticProvider>
            <VoiceProvider>
              <NotificationProvider>{children}</NotificationProvider>
            </VoiceProvider>
          </KineticProvider>
        </FirebaseAuthProvider>
      </AccessibilityProvider>
    </GestureHandlerRootView>
  );
}
