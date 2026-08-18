import { View } from "@/tw";
import type { OnboardingProgressProps } from "@/types";
import { cn } from "@/utils/styles";

const STEPS = [1, 2, 3] as const;

export function OnboardingProgress({ current, className }: OnboardingProgressProps) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Setup step ${current} of 3`}
      accessibilityValue={{ min: 1, max: 3, now: current }}
      className={cn("h-1 flex-row gap-2", className)}
    >
      {STEPS.map((step) => (
        <View
          key={step}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className={cn(
            "h-1 flex-1 rounded-full",
            step <= current ? "bg-primary" : "bg-progress-inactive",
          )}
        />
      ))}
    </View>
  );
}
