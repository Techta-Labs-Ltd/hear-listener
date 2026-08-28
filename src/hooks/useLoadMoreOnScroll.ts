import { useCallback } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

export function useLoadMoreOnScroll({
  hasMore,
  loading,
  onLoadMore,
  threshold = 320,
}: {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void | Promise<void>;
  threshold?: number;
}) {
  return useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!hasMore || loading) return;
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromEnd =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (distanceFromEnd <= threshold) void onLoadMore();
    },
    [hasMore, loading, onLoadMore, threshold],
  );
}
