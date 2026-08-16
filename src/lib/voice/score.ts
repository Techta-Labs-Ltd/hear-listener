import { phoneticKey, voiceTokens, voiceTrigrams } from "./normalize";
export function editDistance(left: string, right: string): number {
  const rows = right.length + 1;
  const previous = Array.from({ length: rows }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j < rows; j += 1) {
      const saved = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      diagonal = saved;
    }
  }
  return previous[right.length];
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
        item.startsWith(token) ||
        token.startsWith(item) ||
        (token.length >= 5 &&
          editDistance(token, item) <=
            Math.max(1, Math.floor(token.length * 0.25))),
    ),
  ).length;
  const overlap =
    matches / Math.max(queryTokens.length, candidateTokens.length);
  const distance = editDistance(normalizedQuery, normalizedCandidate);
  const similarity =
    1 -
    distance / Math.max(normalizedQuery.length, normalizedCandidate.length, 1);
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
      ? 0.12
      : 0;
  return Math.min(
    0.99,
    overlap * 0.42 +
      Math.max(0, similarity) * 0.22 +
      trigram * 0.18 +
      phrase +
      phonetic +
      Math.min(weight, 10) * 0.005,
  );
}
