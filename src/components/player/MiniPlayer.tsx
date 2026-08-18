import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";
import { Pressable, View } from "@/tw";
import { SymbolView } from "@/components/ui/AppIcon";
import { AppText } from "@/components/ui/AppText";
import { colors } from "@/constants/theme";
import { routes } from "@/navigation/routes";
import { usePlayback } from "@/stores";
import { icons } from "@/utils/icons/app-icons";

const isWeb = Platform.OS === "web";
const TAB_BAR_HEIGHT = 72;
const DOCK_GAP = 8;
const TAB_ROOTS = ["/", "/explore", "/library"] as const;

function isTabRoute(pathname: string) {
  return TAB_ROOTS.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );
}

function isDockRoute(pathname: string) {
  return isTabRoute(pathname) || pathname.startsWith("/topic");
}

export function MiniPlayer() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const playback = usePlayback();
  const current = playback.current;

  if (!current || !isDockRoute(pathname)) return null;

  const bottom = isTabRoute(pathname)
    ? insets.bottom + TAB_BAR_HEIGHT + DOCK_GAP
    : insets.bottom + DOCK_GAP;
  const playbackLabel = playback.playing ? "Pause" : "Play";

  return (
    <View pointerEvents="box-none" className="absolute inset-0">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Now playing: ${current.title}${
          playback.playing ? "" : ", paused"
        }`}
        accessibilityHint="Opens the full player"
        onPress={() => router.push(routes.player)}
        className="absolute left-3 right-3 min-h-[62px] flex-row items-center gap-[14px] rounded-2xl bg-voice-panel px-[14px] py-[10px] shadow-lg active:opacity-90"
        style={{ bottom }}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="h-[42px] w-[42px] rounded-[10px]"
          style={{ backgroundColor: current.color }}
        />

        <View className="flex-1 gap-1">
          <AppText
            className="font-body-bold text-xs leading-[15px] text-white"
            numberOfLines={1}
          >
            {current.title}
          </AppText>
          <AppText
            className="text-[11px] leading-[13px] text-voice-muted"
            numberOfLines={1}
          >
            {current.creator} · {current.duration}
          </AppText>
        </View>

        <Pressable
          accessibilityRole={isWeb ? "none" : "button"}
          accessibilityLabel={isWeb ? undefined : playbackLabel}
          accessibilityHint={
            isWeb ? undefined : `${playbackLabel}s the current story`
          }
          hitSlop={6}
          tabIndex={isWeb ? -1 : undefined}
          onPress={(event) => {
            event.stopPropagation();
            playback.toggle();
          }}
          className="h-9 w-9 items-center justify-center rounded-full bg-surface active:opacity-70"
        >
          <SymbolView
            name={playback.playing ? icons.pause : icons.play}
            size={16}
            tintColor={colors.voicePanel}
          />
        </Pressable>
      </Pressable>
    </View>
  );
}
