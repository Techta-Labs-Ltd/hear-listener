import { SymbolView } from "@/components/ui/AppIcon";
import { AppText } from "@/components/ui/AppText";
import { icons } from "@/utils/icons/app-icons";
import { cn } from "@/utils/styles";
import { Pressable } from "@/tw";

export function OptionRow({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      accessibilityHint="Chooses this option."
      onPress={onSelect}
      className={cn(
        "h-[52px] flex-row items-center justify-between rounded-[14px] px-5 active:opacity-90",
        selected ? "bg-primary-soft" : "bg-canvas",
      )}
    >
      <AppText
        className={cn(
          "text-sm leading-[17px]",
          selected ? "font-body-bold text-primary" : "text-ink",
        )}
      >
        {label}
      </AppText>
      {selected ? (
        <SymbolView name={icons.success} size={15} tintColor="#6E38C9" />
      ) : null}
    </Pressable>
  );
}
