import { AppText } from "@/components/ui/AppText";
import { Pressable, View } from "@/tw";
import { feedbackVoiceController } from "@/services/voice/feedback-controller";

export function FeedbackVoicePanel({
  onDismiss,
}: {
  onDismiss?: () => void;
}) {
  const target = feedbackVoiceController.getTarget();

  const handleRating = async (rating: number) => {
    feedbackVoiceController.setRating(rating);
    await feedbackVoiceController.submitFeedback();
    onDismiss?.();
  };

  return (
    <View className="gap-3">
      <AppText
        accessibilityRole="header"
        className="font-display text-[26px] leading-[32px] text-white"
      >
        How was this {target?.kind === "publication" ? "publication" : "track"}?
      </AppText>
      <AppText className="text-[14px] leading-5 text-voice-muted">
        Say “Good”, “Needs work”, or tap an option below.
      </AppText>

      <View className="mt-3 flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Good"
          accessibilityHint="Submits positive feedback"
          onPress={() => void handleRating(5)}
          className="min-h-12 flex-1 items-center justify-center rounded-xl bg-white/15 px-4 active:bg-white/25"
        >
          <AppText className="font-body-bold text-[15px] text-white">
            👍 Good
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Needs work"
          accessibilityHint="Submits improvement feedback"
          onPress={() => void handleRating(2)}
          className="min-h-12 flex-1 items-center justify-center rounded-xl bg-white/15 px-4 active:bg-white/25"
        >
          <AppText className="font-body-bold text-[15px] text-white">
            👎 Needs work
          </AppText>
        </Pressable>
      </View>

      <View className="mt-2 flex-row items-center justify-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip feedback"
          onPress={onDismiss}
          className="min-h-10 items-center justify-center rounded-full px-4 active:bg-white/10"
        >
          <AppText className="font-body-semibold text-xs text-voice-muted">
            Skip
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}
