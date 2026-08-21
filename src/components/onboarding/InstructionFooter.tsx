import { AppText } from "@/components/ui/AppText";
import { View } from "@/tw";
import type { InstructionFooterProps } from "@/types";
import { cn } from "@/utils/styles";

export function InstructionFooter({
  title,
  subtitle,
  notes,
  inverse = false,
  titleClassName,
  className,
}: InstructionFooterProps) {
  return (
    <View
      className={cn(
        "border-t pt-5",
        inverse ? "border-voice-track" : "border-border-strong",
        className,
      )}
    >
      <AppText
        className={cn(
          "font-display text-[19px] leading-[23px]",
          inverse ? "text-white" : "text-ink",
          titleClassName,
        )}
      >
        {title}
      </AppText>
      <AppText
        className={cn(
          "mt-[10px] text-[15px] leading-[18px]",
          inverse ? "text-voice-muted" : "text-muted",
        )}
      >
        {subtitle}
      </AppText>
      {notes?.map((note: string) => (
        <AppText
          key={note}
          className={cn(
            "mt-[14px] text-xs leading-[15px]",
            inverse ? "text-voice-muted" : "text-fine-print",
          )}
        >
          {note}
        </AppText>
      ))}
    </View>
  );
}
