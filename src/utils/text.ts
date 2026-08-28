import type { ContentItem } from "@/types";

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
) {
  return `${count} ${count === 1 ? singular : plural}`;
}
export function initials(value: string, length = 3) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, length)
    .toUpperCase();
}
export function formatDateLabel(date = new Date(), locale = "en-GB") {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(date)
    .toUpperCase();
}
export function greetingForTime(name: string, date = new Date()) {
  const hour = date.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${greeting}, ${name}.`;
}
export function formatClock(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function contentByline(item: ContentItem): string {
  const seen = new Set<string>();
  return [item.creator, item.publication, item.category]
    .filter((value) => {
      const key = value.trim().toLocaleLowerCase("en-GB");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(" · ");
}
