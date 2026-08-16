import { normalizeVoiceText } from "@/lib/voice/normalize";
import { editDistance, scoreVoiceCandidate } from "@/lib/voice/score";
describe("voice normalization", () => {
  it("normalizes accents, contractions, number words, and ASR aliases", () => {
    expect(normalizeVoiceText("WHAT'S HÉAR doing in fifteen minutes?")).toBe(
      "what is hear doing in 15 minutes",
    );
    expect(normalizeVoiceText("paws the story")).toBe("pause the story");
    expect(normalizeVoiceText("wifisettings")).toBe("wifi settings");
  });
  it("scores exact and fuzzy candidates predictably", () => {
    expect(editDistance("library", "libary")).toBe(1);
    expect(scoreVoiceCandidate("open libary", "open library")).toBeGreaterThan(
      0.7,
    );
    expect(
      scoreVoiceCandidate("weather tomorrow", "open library"),
    ).toBeLessThan(0.4);
  });
});
