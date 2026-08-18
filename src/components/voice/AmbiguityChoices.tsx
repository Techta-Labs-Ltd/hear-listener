import { Pressable, View } from "@/tw";
import { AppText } from "@/components/ui/AppText";
import { useVoice } from "@/hooks/useVoice";

export function AmbiguityChoices() {
  const { choices, choose } = useVoice();

  return (
    <View className="w-full gap-3 pt-1">
      {choices.map((item, index) => {
        const isFirst = index === 0;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`${index + 1}: ${item.label}`}
            accessibilityHint={item.detail}
            onPress={() => choose(item)}
            className={
              isFirst
                ? "min-h-[58px] items-start justify-center rounded-[20px] bg-white px-5 active:opacity-90"
                : "min-h-[58px] items-start justify-center rounded-[20px] border border-white/20 bg-white/10 px-5 active:bg-white/20"
            }
          >
            <AppText
              className={
                isFirst
                  ? "font-body-bold text-[16px] leading-5 text-ink"
                  : "font-body-bold text-[16px] leading-5 text-white"
              }
            >
              {index + 1} · {item.label}
            </AppText>
            {item.detail ? (
              <AppText
                className={
                  isFirst
                    ? "mt-0.5 text-[13px] leading-4 text-muted"
                    : "mt-0.5 text-[13px] leading-4 text-voice-muted"
                }
              >
                {item.detail}
              </AppText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
