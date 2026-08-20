import { usePlayback } from "@/stores";
import { EmptyPlayer } from "@/components/player/EmptyPlayer";
import { FinishedPlayer } from "@/components/player/FinishedPlayer";
import { PlayingPlayer } from "@/components/player/PlayingPlayer";

export function PlayerScreen() {
  const playback = usePlayback();

  if (!playback.current) return <EmptyPlayer />;
  if (playback.progress >= 1) return <FinishedPlayer current={playback.current} />;
  return <PlayingPlayer current={playback.current} />;
}
