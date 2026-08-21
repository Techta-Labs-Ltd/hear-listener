import { useEffect, useState } from "react";
import Svg, { Circle } from "react-native-svg";
import { AppText } from "@/components/ui/AppText";
import { View } from "@/tw";
import type { ListeningCountdownProps } from "@/types";

export function ListeningCountdown({
  durationMs = 8000,
  deadlineAt,
  speechDetected,
  size = 36,
  strokeWidth = 3.5,
}: ListeningCountdownProps) {
  const [remainingMs, setRemainingMs] = useState(durationMs);

  useEffect(() => {
    if (!deadlineAt || speechDetected) return;

    const updateTimer = () => {
      const now = Date.now();
      const left = Math.max(0, deadlineAt - now);
      setRemainingMs(left);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 50);
    return () => clearInterval(interval);
  }, [deadlineAt, durationMs, speechDetected]);

  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.max(0, Math.min(1, remainingMs / durationMs));
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${remainingSeconds} seconds remaining`}
      accessibilityValue={{
        min: 0,
        max: 8,
        now: remainingSeconds,
        text: `${remainingSeconds} seconds remaining`,
      }}
      className="items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.22)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {!speechDetected && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#a78bfa"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        )}
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <AppText className="text-[12px] font-bold text-white tracking-tight">
          {speechDetected ? "●" : `${remainingSeconds}s`}
        </AppText>
      </View>
    </View>
  );
}
