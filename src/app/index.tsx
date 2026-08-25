import { routes } from "@/navigation/routes";
import { usePreferences } from "@/stores";
import { View } from "@/tw";
import { Redirect } from "expo-router";

export default function Index() {
  const { ready } = usePreferences();
  if (!ready) return <View className="flex-1 bg-canvas" />;
  return (
    <Redirect
      href={routes.onboarding}
    />
  );
}
