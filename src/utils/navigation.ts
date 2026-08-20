import type { Router } from "expo-router";
import { routes } from "@/navigation/routes";

export function safeBack(router: Router, fallback: string = routes.home): void {
  try {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback as any);
    }
  } catch {
    router.replace(fallback as any);
  }
}
