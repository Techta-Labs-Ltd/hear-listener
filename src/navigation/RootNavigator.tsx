import { Stack } from "expo-router";

const modalOptions = { presentation: "modal" as const };

export function RootNavigator() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings" options={modalOptions} />
      <Stack.Screen name="player" options={modalOptions} />
      <Stack.Screen name="topic/[id]" />
    </Stack>
  );
}
