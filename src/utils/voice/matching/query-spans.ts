import type { TextSpan } from "@/types";

export function generateQueryWindows(
  tokens: string[],
  maxWindows = 12,
): TextSpan[] {
  const spans: TextSpan[] = [];
  const tokenCount = tokens.length;
  outer: for (let length = tokenCount; length >= 1; length -= 1) {
    for (let start = 0; start + length <= tokenCount; start += 1) {
      spans.push({
        start,
        end: start + length,
        text: tokens.slice(start, start + length).join(" "),
      });
      if (spans.length >= maxWindows) break outer;
    }
  }
  return spans;
}

export function spansOverlap(left: TextSpan, right: TextSpan): boolean {
  return left.start < right.end && right.start < left.end;
}
