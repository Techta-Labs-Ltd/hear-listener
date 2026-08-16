import type { AppIconProps } from "@/types";
import { SymbolView as NativeSymbolView } from "expo-symbols";

const androidSymbols: Record<string, string> = {
  gearshape: "settings",
  "mic.fill": "mic",
  "location.fill": "location_on",
  "speaker.wave.2.fill": "volume_up",
  "textformat.size": "text_fields",
  "bookmark.fill": "bookmark",
  "person.2.fill": "group",
  "arrow.down.circle.fill": "download",
  "arrow.down.circle": "download",
  "clock.fill": "history",
  waveform: "graphic_eq",
  checkmark: "check",
  exclamationmark: "error",
  "play.fill": "play_arrow",
  "pause.fill": "pause",
  "chevron.left": "chevron_left",
  "chevron.right": "chevron_right",
  "goforward.15": "forward_10",
  "gobackward.15": "replay_10",
  repeat: "repeat",
  "house.fill": "home",
  "safari.fill": "explore",
  "books.vertical.fill": "library_books",
  xmark: "close",
  "chevron.down": "keyboard_arrow_down",
  "play.circle": "play_circle",
  bookmark: "bookmark_border",
  "person.2": "group",
  clock: "history",
  "wave.3.right": "bluetooth",
  network: "language",
  wifi: "wifi",
  "slider.horizontal.3": "tune",
  accessibility: "accessibility_new",
  "hand.raised.fill": "privacy_tip",
  "arrow.right": "arrow_forward",
  tray: "inbox",
};

export function AppIcon({ name, size = 24, tintColor }: AppIconProps) {
  const mappedName = typeof name === "string"
    ? {
      ios: name,
      android: androidSymbols[name] ?? "help",
      web: androidSymbols[name] ?? "help",
    }
    : name;

  return <NativeSymbolView name={mappedName as never} size={size} tintColor={tintColor} />;
}

export { AppIcon as SymbolView };
