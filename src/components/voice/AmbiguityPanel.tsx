import { AppText } from "@/components/ui/AppText";
import { Pressable, View } from "@/tw";
import type { VoiceChoice } from "@/types";
import { ambiguityController } from "@/services/voice/ambiguity-controller";
import { useAmbiguityStore } from "@/stores/ambiguity-store";

export function AmbiguityPanel({
  prompt,
  choices,
  onSelect,
  onCancel,
}: {
  prompt: string;
  choices: VoiceChoice[];
  onSelect?: (choice: VoiceChoice) => void;
  onCancel?: () => void;
}) {
  const selectedIndex = useAmbiguityStore(
    (state) => state.pending?.selectedIndex ?? 0,
  );

  return (
    <View className="gap-3">
      <AppText
        accessibilityRole="header"
        className="font-display text-[26px] leading-[32px] text-white"
      >
        {prompt || "Which one would you like?"}
      </AppText>
      <AppText className="text-[14px] leading-5 text-voice-muted">
        Tilt left/right or tap an option to select.
      </AppText>

      <View className="mt-2 gap-2">
        {choices.map((choice, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Pressable
              key={choice.id}
              accessibilityRole="button"
              accessibilityLabel={`${choice.label}, option ${index + 1} of ${choices.length}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                if (onSelect) {
                  onSelect(choice);
                } else {
                  ambiguityController.selectIndex(index);
                }
              }}
              className={`min-h-12 w-full flex-row items-center justify-between rounded-xl px-4 py-3 ${
                isSelected
                  ? "bg-white text-[#21102F]"
                  : "bg-white/10 text-white active:bg-white/20"
              }`}
            >
              <AppText
                className={`font-body-bold text-[15px] ${
                  isSelected ? "text-[#21102F]" : "text-white"
                }`}
              >
                {choice.label}
              </AppText>
              <AppText
                className={`font-body-semibold text-xs ${
                  isSelected ? "text-[#21102F]/70" : "text-voice-muted"
                }`}
              >
                {index + 1} of {choices.length}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-2 flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          onPress={onCancel}
          className="min-h-10 items-center justify-center rounded-full px-4 active:bg-white/10"
        >
          <AppText className="font-body-semibold text-xs text-voice-muted">
            Cancel
          </AppText>
        </Pressable>
        <AppText className="text-xs text-voice-muted">
          Say the number or name
        </AppText>
      </View>
    </View>
  );
}
