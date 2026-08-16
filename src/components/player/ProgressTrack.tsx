import { View } from "@/tw";
import { cn } from "@/utils/styles";
import type { ProgressTrackProps } from "@/types";

export function ProgressTrack({
  progress,
  height = 3,
  style,
  className,
}: ProgressTrackProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Playback progress"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(clamped * 100),
      }}
      className={cn("overflow-hidden rounded-full bg-border", className)}
      style={[{ height }, style]}
    >
      <View
        className="h-full rounded-full bg-primary"
        style={{ width: `${clamped * 100}%` }}
      />
    </View>
  );
}
