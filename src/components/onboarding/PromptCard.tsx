import { AppText } from "@/components/ui/AppText";
import { View } from "@/tw";
import type { PromptCardProps } from "@/types";
import { cn } from "@/utils/styles";

export function PromptCard({ label, command, size = "regular", className }: PromptCardProps) {
  return (
    <View
      className={cn(
        "gap-2.5 rounded-[20px] border border-border bg-surface p-5",
        className,
      )}
    >
      <AppText variant="overline" tone="primary" className="tracking-[0.4px]">
        {label}
      </AppText>
      <AppText
        className={cn(
          "font-display text-ink",
          size === "large" ? "text-[22px] leading-[26px]" : "text-[19px] leading-[23px]",
        )}
      >
        {command}
      </AppText>
    </View>
  );
}
