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
  for (const [from, to] of Object.entries(CONTRACTIONS)) {
    text = text.replaceAll(from, to);
  }
  text = text
    .replace(/&/g, " and ")
    .replace(/[*_#@!?,.:;"'()\[\]{}]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
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

export function stemWord(word: string): string {
  if (word.length <= 3) return word;
  const s = word.toLowerCase();
  if (s.endsWith("ies") && s.length > 4) return s.slice(0, -3) + "y";
  if (s.endsWith("ing") && s.length > 4) return s.slice(0, -3);
  if (s.endsWith("ed") && s.length > 3) return s.slice(0, -2);
  if (s.endsWith("es") && s.length > 3) return s.slice(0, -2);
  if (s.endsWith("s") && !s.endsWith("ss") && s.length > 2) return s.slice(0, -1);
  if (s.endsWith("tion") && s.length > 5) return s.slice(0, -4);
  if (s.endsWith("ly") && s.length > 3) return s.slice(0, -2);
  return s;
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

export function editDistance(left: string, right: string): number {
  return damerauLevenshteinDistance(left, right);
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

export function longestCommonSubsequenceLength(
  left: string,
  right: string,
): number {
  const m = left.length;
  const n = right.length;
  if (m === 0 || n === 0) return 0;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (left[i - 1] === right[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n];
}

export function jaroWinklerSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  const l1 = s1.length;
  const l2 = s2.length;
  if (l1 === 0 || l2 === 0) return 0;

  const matchDistance = Math.floor(Math.max(l1, l2) / 2) - 1;
  const s1Matches = new Array(l1).fill(false);
  const s2Matches = new Array(l2).fill(false);

  let matches = 0;
  for (let i = 0; i < l1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, l2);
    for (let j = start; j < end; j++) {
      if (!s2Matches[j] && s1[i] === s2[j]) {
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }
  }

  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < l1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / l1 + matches / l2 + (matches - transpositions / 2) / matches) / 3;

  // Prefix bonus up to 4 characters
  let prefix = 0;
  for (let i = 0; i < Math.min(4, l1, l2); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

export function sequenceDistance(left: string, right: string): number {
  return damerauLevenshteinDistance(left, right);
}

export function sequenceSimilarity(left: string, right: string): number {
  const normLeft = normalizeVoiceText(left);
  const normRight = normalizeVoiceText(right);
  if (normLeft === normRight) return 1;
  if (!normLeft || !normRight) return 0;

  const jaro = jaroWinklerSimilarity(normLeft, normRight);
  const maxLen = Math.max(normLeft.length, normRight.length);
  const damerau = 1 - damerauLevenshteinDistance(normLeft, normRight) / maxLen;
  const lcs =
    (2 * longestCommonSubsequenceLength(normLeft, normRight)) /
    (normLeft.length + normRight.length);

  return Math.max(0, Math.min(1, jaro * 0.45 + damerau * 0.35 + lcs * 0.2));
}

export function scoreVoiceCandidate(
  query: string,
  candidate: string,
  weight = 1,
): number {
  const queryTokens = voiceTokens(query);
  const candidateTokens = voiceTokens(candidate);
  if (!queryTokens.length || !candidateTokens.length) return 0;
  const normalizedQuery = queryTokens.join(" ");
  const normalizedCandidate = candidateTokens.join(" ");
  if (normalizedQuery === normalizedCandidate) return 1;

  const matches = queryTokens.filter((token) =>
    candidateTokens.some(
      (item) =>
        item === token ||
        stemWord(item) === stemWord(token) ||
        item.startsWith(token) ||
        token.startsWith(item) ||
        metaphone(item) === metaphone(token) ||
        (token.length >= 4 &&
          damerauLevenshteinDistance(token, item) <=
            Math.max(1, Math.floor(token.length * 0.28))),
    ),
  ).length;

  const overlap =
    matches / Math.max(queryTokens.length, candidateTokens.length);
  const seqSim = sequenceSimilarity(normalizedQuery, normalizedCandidate);
  const phrase =
    normalizedCandidate.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedCandidate)
      ? 0.15
      : 0;
  const queryGrams = voiceTrigrams(normalizedQuery);
  const candidateGrams = new Set(voiceTrigrams(normalizedCandidate));
  const trigram =
    queryGrams.filter((gram) => candidateGrams.has(gram)).length /
    Math.max(queryGrams.length, candidateGrams.size, 1);
  const phonetic =
    phoneticKey(normalizedQuery) === phoneticKey(normalizedCandidate)
      ? 0.14
      : 0;

  return Math.min(
    0.99,
    overlap * 0.38 +
      seqSim * 0.24 +
      trigram * 0.18 +
      phrase +
      phonetic +
      Math.min(weight, 10) * 0.005,
  );
}
