import Svg, { Circle } from "react-native-svg";
import { AppText } from "@/components/ui/AppText";
import { useListeningTimer } from "@/hooks/useListeningTimer";
import { View } from "@/tw";
import type { ListeningCountdownProps } from "@/types";

export function ListeningCountdown({
  durationMs = 8000,
  deadlineAt,
  speechDetected,
  size = 30,
  strokeWidth = 2.5,
}: ListeningCountdownProps) {
  const { remainingSeconds, progressRatio } = useListeningTimer(
    deadlineAt,
    speechDetected,
    durationMs,
  );

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
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
