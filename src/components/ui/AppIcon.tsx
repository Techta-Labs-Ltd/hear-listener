import type { AppIconProps } from "@/types";
import { SymbolView as NativeSymbolView } from "expo-symbols";

const androidSymbols: Record<string, string> = {
  gearshape: "settings",
  "mic.fill": "mic",
  "location.fill": "location_on",
  "speaker.wave.2.fill": "volume_up",
  "textformat.size": "text_fields",
  "bookmark.fill": "bookmark",
  bookmark: "bookmark_border",
  "person.2.fill": "group",
  "person.2": "group",
  "person.crop.circle.fill": "account_circle",
  "arrow.down.circle.fill": "download_for_offline",
  "arrow.down.circle": "download",
  "clock.fill": "history",
  clock: "history",
  waveform: "graphic_eq",
  checkmark: "check",
  exclamationmark: "error",
  "play.fill": "play_arrow",
  "pause.fill": "pause",
  "play.circle": "play_circle",
  "chevron.left": "chevron_left",
  "chevron.right": "chevron_right",
  "chevron.down": "keyboard_arrow_down",
  "goforward.15": "forward_10",
  "gobackward.15": "replay_10",
  repeat: "repeat",
  house: "home",
  "house.fill": "home",
  safari: "explore",
  "safari.fill": "explore",
  "doc.text": "description",
  "doc.text.fill": "article",
  "books.vertical.fill": "library_books",
  xmark: "close",
  "wave.3.right": "bluetooth",
  network: "language",
  wifi: "wifi",
  "slider.horizontal.3": "tune",
  accessibility: "accessibility_new",
  "hand.raised.fill": "privacy_tip",
  "arrow.right": "arrow_forward",
  magnifyingglass: "search",
  plus: "add",
  "list.bullet": "format_list_bulleted",
  tray: "inbox",
};

export function AppIcon({ name, size = 24, tintColor }: AppIconProps) {
  const mappedName =
    typeof name === "string"
      ? {
          ios: name,
          android: androidSymbols[name] ?? name,
          web: androidSymbols[name] ?? name,
        }
      : name;

  return (
    <NativeSymbolView
      name={mappedName as never}
      size={size}
      tintColor={tintColor}
    />
  );
}

export { AppIcon as SymbolView };
