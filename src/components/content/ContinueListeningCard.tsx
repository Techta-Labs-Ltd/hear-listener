import { routes } from "@/navigation/routes";
import { usePlayback } from "@/stores";
import type { ContinueListeningCardProps } from "@/types";
import { useRouter } from "expo-router";
import { PromoCard } from "./PromoCard";

export function ContinueListeningCard({ item, className }: ContinueListeningCardProps) {
  const router = useRouter();
  const playback = usePlayback();

  return (
    <PromoCard
      eyebrow="CONTINUE LISTENING"
      title={item.title}
      meta={`${item.creator} · ${item.duration}`}
      playLabel="Resume playback"
      accessibilityValue={
        item.progress !== undefined
          ? { text: `${Math.round(item.progress * 100)} percent listened` }
          : undefined
      }
      accessibilityHint="Resumes playback and opens the player."
      onPress={() => {
        playback.play(item);
        router.push(routes.player);
      }}
      className={className}
    />
  );
}
