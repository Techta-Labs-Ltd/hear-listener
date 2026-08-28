import { WholeWordProfanityFilter } from "@/utils/voice/profanity-filter";

describe("profanity filter", () => {
  it("removes offensive whole tokens without corrupting innocent words", () => {
    const filter = new WholeWordProfanityFilter();
    expect(filter.sanitize("play the shit news").sanitized).toBe("play the news");
    expect(filter.sanitize("play scunthorpe news").sanitized).toBe(
      "play scunthorpe news",
    );
    expect(filter.sanitize("play assessing the news").sanitized).toBe(
      "play assessing the news",
    );
  });

  it("masks instead of removing in mask mode and preserves spacing", () => {
    const filter = new WholeWordProfanityFilter();
    const result = filter.sanitize("play fuck tynedale", "mask");
    expect(result.sanitized).toBe("play **** tynedale");
  });

  it("removes multiword and inflected variants", () => {
    const filter = new WholeWordProfanityFilter();
    expect(filter.sanitize("i am so pissed off").sanitized).toBe("i am so");
    expect(filter.sanitize("that was fucking great").sanitized).toBe(
      "that was great",
    );
  });

  it("protects tokens inside supplied entity phrases", () => {
    const filter = new WholeWordProfanityFilter(["shit creek"]);
    const result = filter.sanitize("play shit creek");
    expect(result.sanitized).toBe("play shit creek");
    expect(result.removedCount).toBe(0);
  });

  it("counts removed matches and reports matched terms", () => {
    const filter = new WholeWordProfanityFilter();
    const result = filter.sanitize("fuck this shit");
    expect(result.removedCount).toBe(2);
    expect(result.matchedTerms).toEqual(
      expect.arrayContaining(["fuck", "shit"]),
    );
  });

  it("sanitizes each alternative independently", () => {
    const filter = new WholeWordProfanityFilter();
    const alternatives = ["play shit news", "play tynedale talking magazine"];
    const cleaned = alternatives.map((alt) => filter.sanitize(alt).sanitized);
    expect(cleaned).toEqual(["play news", "play tynedale talking magazine"]);
  });

  it("leaves clean text unchanged", () => {
    const filter = new WholeWordProfanityFilter();
    const input = "play the latest publication from tynedale talking magazine";
    expect(filter.sanitize(input).sanitized).toBe(input);
  });
});
