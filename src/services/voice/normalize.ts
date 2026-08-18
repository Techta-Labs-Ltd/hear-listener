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
  for (const [from, to] of Object.entries(CONTRACTIONS))
    text = text.replaceAll(from, to);
  text = text
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

export function voiceTrigrams(value: string): string[] {
  const padded = `  ${normalizeVoiceText(value).replaceAll(" ", "_")}  `;
  const grams = new Set<string>();
  for (let index = 0; index <= padded.length - 3; index += 1)
    grams.add(padded.slice(index, index + 3));
  return [...grams];
}

export function phoneticKey(value: string): string {
  return voiceTokens(value)
    .map((token) => {
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
    })
    .join("-");
}
