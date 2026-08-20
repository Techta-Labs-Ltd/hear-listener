import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
} from "react-native-reanimated";
import { View } from "@/tw";
import { cn } from "@/utils/styles";

export function Shimmer({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 850 }),
        withTiming(0.35, { duration: 850 }),
      ),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle} className={cn("overflow-hidden", className)}>
      {children}
    </Animated.View>
  );
}

export function ShimmerBlock({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "soft" | "dark";
}) {
  const bg =
    tone === "soft"
      ? "bg-[#EDE9F2]"
      : tone === "dark"
      ? "bg-[#3D2C4D]"
      : "bg-[#DFD8E8]";

  return (
    <Shimmer className={cn("rounded-[12px]", bg, className)}>
      <View className="h-full w-full" />
    </Shimmer>
  );
}
