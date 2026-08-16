import { Redirect } from "expo-router";
import { usePreferences } from "@/stores";
import { routes } from "@/navigation/routes";
import { LoadingScreen } from "@/components/brand/LoadingScreen";
export default function Index() {
  const { ready, preferences } = usePreferences();
  if (!ready) return <LoadingScreen />;
  return (
    <Redirect
      href={preferences.setupComplete ? routes.home : routes.onboarding}
    />
  );
}
