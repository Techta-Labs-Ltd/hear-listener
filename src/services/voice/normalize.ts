import type { DoubleMetaphoneCodes } from "@/types";

const NUMBER_WORDS: Record<string, string> = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
  twelve: "12",
  fifteen: "15",
  twenty: "20",
  thirty: "30",
  forty: "40",
  fifty: "50",
  sixty: "60",
  ninety: "90",
};

const CONTRACTIONS: Record<string, string> = {
  "what's": "what is",
  "who's": "who is",
  "i'm": "i am",
  "i'd": "i would",
  "don't": "do not",
  "can't": "cannot",
  "won't": "will not",
  "let's": "let us",
  "couldn't": "could not",
  "wouldn't": "would not",
  "isn't": "is not",
};

const SAFE_ASR: Record<string, string> = {
  here: "hear",
  hair: "hear",
  paws: "pause",
  ports: "pause",
  blutooth: "bluetooth",
  bluettoh: "bluetooth",
  bluetoth: "bluetooth",
  blutooh: "bluetooth",
  blootuth: "bluetooth",
  acessibility: "accessibility",
  locashun: "location",
  loction: "location",
  locaton: "location",
  lacation: "location",
  loacation: "location",
  ocation: "location",
  localation: "location",
  liberty: "library",
  magazin: "magazine",
};

const PHRASE_VARIANTS: Record<string, string> = {
  "why fi settings": "wifi settings",
  "wife eye settings": "wifi settings",
  "blue tooth": "bluetooth",
  "access ability": "accessibility",
  "re wind": "rewind",
  "here app": "hear app",
};

const JOINED_WORDS: Record<string, string> = {
  wifisetting: "wifi setting",
  wifisettings: "wifi settings",
  audiobook: "audio book",
  localnews: "local news",
  sleeptimer: "sleep timer",
  nowplaying: "now playing",
};

export function normalizeVoiceText(value: string): string {
  let text = value
    .toLocaleLowerCase("en-GB")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  for (const [from, to] of Object.entries(CONTRACTIONS)) {
    text = text.replaceAll(from, to);
  }
  text = text
    .replace(/&/g, " and ")
    .replace(/[*_#@!?,.:;"'()\[\]{}]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [from, to] of Object.entries(PHRASE_VARIANTS)) {
    text = text.replaceAll(from, to);
  }
  return text
    .split(" ")
    .filter(Boolean)
    .flatMap((token) => {
      const joined = JOINED_WORDS[token] ?? token;
      return joined
        .split(" ")
        .map((part) => SAFE_ASR[part] ?? NUMBER_WORDS[part] ?? part);
    })
    .join(" ");
}

export function voiceTokens(value: string): string[] {
  return normalizeVoiceText(value).split(" ").filter(Boolean);
}

const VALID_SINGLE_LETTER_WORDS = new Set(["a", "i", "o"]);

export function hasMeaningfulSpeech(value: string | null | undefined): boolean {
  if (!value) return false;
  const tokens = voiceTokens(value);
  if (tokens.length === 0) return false;
  return tokens.some((token) => {
    if (token.length >= 2) return true;
    if (/^\d+$/.test(token)) return true;
    return VALID_SINGLE_LETTER_WORDS.has(token);
  });
}

export function metaphone(word: string): string {
  let w = word.toUpperCase().replace(/[^A-Z]/g, "");
  if (!w) return "";

  if (
    w.startsWith("KN") ||
    w.startsWith("GN") ||
    w.startsWith("PN") ||
    w.startsWith("WR") ||
    w.startsWith("PS")
  ) {
    w = w.slice(1);
  } else if (w.startsWith("X")) {
    w = "S" + w.slice(1);
  } else if (w.startsWith("WH")) {
    w = "W" + w.slice(2);
  }

  let result = "";
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    const next = w[i + 1] ?? "";
    const next2 = w[i + 2] ?? "";
    const prev = w[i - 1] ?? "";

    if (c === prev && c !== "C") continue;

    if (c === "A" || c === "E" || c === "I" || c === "O" || c === "U" || c === "Y") {
      if (i === 0) result += c;
    } else if (c === "B") {
      if (!(prev === "M" && i === w.length - 1)) result += "B";
    } else if (c === "C") {
      if (next === "I" && next2 === "A") {
        result += "X";
        i += 2;
      } else if (next === "H") {
        result += "X";
        i++;
      } else if (next === "E" || next === "I" || next === "Y") {
        result += "S";
      } else {
        result += "K";
      }
    } else if (c === "D") {
      if (next === "G" && (next2 === "E" || next2 === "I" || next2 === "Y")) {
        result += "J";
        i += 2;
      } else {
        result += "T";
      }
    } else if (c === "F") {
      result += "F";
    } else if (c === "G") {
      if (next === "H" && i === w.length - 2) {
        // silent GH at word end
      } else if (next === "E" || next === "I" || next === "Y") {
        result += "J";
      } else {
        result += "K";
      }
    } else if (c === "H") {
      if ("AEIOUY".includes(next) && !"CSPTG".includes(prev)) {
        result += "H";
      }
    } else if (c === "J") {
      result += "J";
    } else if (c === "K") {
      if (prev !== "C") result += "K";
    } else if (c === "L") {
      result += "L";
    } else if (c === "M") {
      result += "M";
    } else if (c === "N") {
      result += "N";
    } else if (c === "P") {
      if (next === "H") {
        result += "F";
        i++;
      } else {
        result += "P";
      }
    } else if (c === "Q") {
      result += "K";
    } else if (c === "R") {
      result += "R";
    } else if (c === "S") {
      if (next === "H" || (next === "I" && (next2 === "O" || next2 === "A"))) {
        result += "X";
        i += next === "H" ? 1 : 2;
      } else {
        result += "S";
      }
    } else if (c === "T") {
      if (next === "I" && (next2 === "A" || next2 === "O")) {
        result += "X";
        i += 2;
      } else if (next === "H") {
        result += "0";
        i++;
      } else if (next === "C" && next2 === "H") {
        result += "X";
        i += 2;
      } else {
        result += "T";
      }
    } else if (c === "V") {
      result += "F";
    } else if (c === "W") {
      if ("AEIOUY".includes(next)) result += "W";
    } else if (c === "X") {
      result += "KS";
    } else if (c === "Z") {
      result += "S";
    }
  }

  return result.slice(0, 6);
}

export function soundexKey(value: string): string {
  const token = value.toLowerCase();
  const first = token[0] ?? "";
  const tail = token
    .slice(1)
    .replace(/[aeiouyhw]/g, "")
    .replace(/[bfpv]/g, "1")
    .replace(/[cgjkqsxz]/g, "2")
    .replace(/[dt]/g, "3")
    .replace(/l/g, "4")
    .replace(/[mn]/g, "5")
    .replace(/r/g, "6")
    .replace(/(.)\1+/g, "$1");
  return `${first}${tail}`.slice(0, 6);
}

export function phoneticKey(value: string): string {
  return voiceTokens(value)
    .map((token) => metaphone(token) || soundexKey(token))
    .join("-");
}

export function doubleMetaphoneCodes(value: string): DoubleMetaphoneCodes {
  return {
    primary: phoneticKey(value),
    secondary: voiceTokens(value).map(soundexKey).join("-"),
  };
}

export function phoneticCodeSimilarity(left: string, right: string): number {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const maxLength = Math.max(left.length, right.length);
  return Math.max(0, 1 - damerauLevenshteinDistance(left, right) / maxLength);
}

export function voiceTrigrams(value: string): string[] {
  const text = normalizeVoiceText(value).replaceAll(" ", "_");
  if (!text) return [];
  const padded = `  ${text}  `;
  const grams = new Set<string>();
  for (let index = 0; index <= padded.length - 3; index += 1) {
    grams.add(padded.slice(index, index + 3));
  }
  return [...grams];
}

export function damerauLevenshteinDistance(left: string, right: string): number {
  const lenL = left.length;
  const lenR = right.length;
  if (lenL === 0) return lenR;
  if (lenR === 0) return lenL;

  const d: number[][] = Array.from({ length: lenL + 1 }, () =>
    new Array(lenR + 1).fill(0),
  );

  for (let i = 0; i <= lenL; i++) d[i][0] = i;
  for (let j = 0; j <= lenR; j++) d[0][j] = j;

  for (let i = 1; i <= lenL; i++) {
    for (let j = 1; j <= lenR; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost, // substitution
      );

      if (
        i > 1 &&
        j > 1 &&
        left[i - 1] === right[j - 2] &&
        left[i - 2] === right[j - 1]
      ) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // transposition
      }
    }
  }

  return d[lenL][lenR];
}

