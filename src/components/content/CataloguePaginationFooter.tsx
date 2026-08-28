import { Button } from "@/components/ui/Button";
import { ContentRowsSkeleton } from "@/components/content/SearchSkeleton";
import { AppText } from "@/components/ui/AppText";
import { View } from "@/tw";
import type { CataloguePaginationFooterProps } from "@/types";

export function CataloguePaginationFooter({
  loading,
  hasMore,
  error,
  onLoadMore,
  className,
}: CataloguePaginationFooterProps) {
  if (loading) {
    return (
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Loading more Hear! audio"
        className={className}
      >
        <ContentRowsSkeleton count={2} />
      </View>
    );
  }

  if (error) {
    return (
      <View className={className}>
        <AppText tone="muted" className="text-center text-sm leading-5">
          {error}
        </AppText>
        <Button
          label="Try loading more again"
          variant="secondary"
          onPress={onLoadMore}
          className="mt-3 self-center"
        />
      </View>
    );
  }

  if (!hasMore) return null;
  return (
    <Button
      label="Load more audio"
      variant="secondary"
      onPress={onLoadMore}
      className={className}
    />
  );
}
