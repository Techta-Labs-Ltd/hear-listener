import { useState } from "react";
import { FlatList } from "react-native";
import { Pressable, View } from "@/tw";
import { AppText } from "@/components/ui/AppText";
import { spacing } from "@/constants/theme";
import { useVoice } from "@/hooks/useVoice";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

const GAP = spacing.sm;

export function AmbiguityChoices() {
  const { prompt, choices, choose } = useVoice();
  const [page, setPage] = useState(0);
  const { contentWidth, gutter } = useResponsiveLayout();
  const pageWidth = Math.min(contentWidth - gutter * 2, 480);

  return (
    <View className="w-full gap-3">
      <AppText variant="label" tone="muted" className="text-center">
        {prompt}
      </AppText>
      <FlatList
        data={choices}
        keyExtractor={(choice) => choice.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={pageWidth + GAP}
        decelerationRate="fast"
        contentContainerStyle={{ gap: GAP }}
        onMomentumScrollEnd={(event) =>
          setPage(
            Math.round(event.nativeEvent.contentOffset.x / (pageWidth + GAP)),
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={() => choose(item)}
            className="min-h-26 justify-center gap-1 rounded-card border border-border bg-canvas p-4 active:border-primary active:bg-primary-soft"
            style={{ width: pageWidth }}
          >
            <AppText variant="heading">{item.label}</AppText>
            {item.detail ? (
              <AppText variant="label" tone="muted">
                {item.detail}
              </AppText>
            ) : null}
            <AppText tone="primary" className="absolute bottom-3 right-4 text-xl">
              →
            </AppText>
          </Pressable>
        )}
      />
      <View className="items-center gap-1">
        <AppText variant="overline" tone="primary">
          CHOICE {page + 1} OF {choices.length}
        </AppText>
        <AppText variant="label" tone="muted">
          Swipe for another. Tap to choose.
        </AppText>
      </View>
    </View>
  );
}
