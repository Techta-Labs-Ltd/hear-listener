import {
  damerauLevenshteinDistance,
  doubleMetaphoneCodes,
  hasMeaningfulSpeech,
  normalizeVoiceText,
  phoneticCodeSimilarity,
  phoneticKey,
  voiceTrigrams,
} from "@/services/voice/normalize";

describe("voice normalization", () => {
  it("normalizes accents, contractions, number words, and ASR aliases", () => {
    expect(normalizeVoiceText("WHAT'S HÉAR doing in fifteen minutes?")).toBe(
      "what is hear doing in 15 minutes",
    );
    expect(normalizeVoiceText("paws the story")).toBe("pause the story");
    expect(normalizeVoiceText("wifisettings")).toBe("wifi settings");
  });

  it("corrects generic ASR variants without touching entity names", () => {
    expect(normalizeVoiceText("blue tooth settings")).toBe(
      "bluetooth settings",
    );
    expect(normalizeVoiceText("why fi settings")).toBe("wifi settings");
    expect(normalizeVoiceText("access ability settings")).toBe(
      "accessibility settings",
    );
    expect(normalizeVoiceText("ports the audio")).toBe("pause the audio");
  });

  it("computes damerau-levenshtein distance", () => {
    expect(damerauLevenshteinDistance("library", "libary")).toBe(1);
    expect(damerauLevenshteinDistance("settings", "setings")).toBe(1);
  });

  it("produces primary and secondary phonetic codes", () => {
    const codes = doubleMetaphoneCodes("colour");
    expect(codes.primary).toBe(phoneticKey("color"));
    expect(codes.secondary.length).toBeGreaterThan(0);
    expect(phoneticCodeSimilarity("YK", "YK")).toBe(1);
  });

  it("keeps trigram extraction stable", () => {
    const grams = voiceTrigrams("play local news");
    expect(grams.some((g) => g.includes("pla"))).toBe(true);
    expect(grams.some((g) => g.includes("lay"))).toBe(true);
    expect(voiceTrigrams("go")).toEqual(["  g", " go", "go ", "o  "]);
    expect(voiceTrigrams("")).toEqual([]);
  });

  describe("hasMeaningfulSpeech validation", () => {
    it("rejects empty, whitespace, and punctuation-only noise", () => {
      expect(hasMeaningfulSpeech("")).toBe(false);
      expect(hasMeaningfulSpeech("   ")).toBe(false);
      expect(hasMeaningfulSpeech(".")).toBe(false);
      expect(hasMeaningfulSpeech("...")).toBe(false);
      expect(hasMeaningfulSpeech("---")).toBe(false);
      expect(hasMeaningfulSpeech("****")).toBe(false);
      expect(hasMeaningfulSpeech(null)).toBe(false);
      expect(hasMeaningfulSpeech(undefined)).toBe(false);
    });

    it("accepts valid voice commands and speech words", () => {
      expect(hasMeaningfulSpeech("play my local news")).toBe(true);
      expect(hasMeaningfulSpeech("pause")).toBe(true);
      expect(hasMeaningfulSpeech("tyndale talking magazine")).toBe(true);
      expect(hasMeaningfulSpeech("apple")).toBe(true);
      expect(hasMeaningfulSpeech("google")).toBe(true);
      expect(hasMeaningfulSpeech("not now")).toBe(true);
    });

    it("accepts valid single numbers and single-letter words", () => {
      expect(hasMeaningfulSpeech("1")).toBe(true);
      expect(hasMeaningfulSpeech("2")).toBe(true);
      expect(hasMeaningfulSpeech("a")).toBe(true);
      expect(hasMeaningfulSpeech("i")).toBe(true);
    });
  });
});
