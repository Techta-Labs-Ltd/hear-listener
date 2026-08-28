import { stripSafeFillers } from "@/utils/voice/transcript-preparation";

describe("transcript preparation / safe filler removal", () => {
  it("removes conversational filler words on token boundaries", () => {
    expect(stripSafeFillers("please play the news").sanitized).toBe(
      "play the news",
    );
    expect(stripSafeFillers("um can you play local news").sanitized).toBe(
      "play local news",
    );
  });

  it("removes filler phrases without damaging entity text", () => {
    expect(
      stripSafeFillers("please can you play tynedale talking magazine")
        .sanitized,
    ).toBe("play tynedale talking magazine");
  });

  it("preserves protected phrases from filler stripping", () => {
    const result = stripSafeFillers("play please town", ["please town"]);
    expect(result.sanitized).toBe("play please town");
  });

  it("does not remove substrings of innocent words", () => {
    expect(stripSafeFillers("play the ermines of the story").sanitized).toBe(
      "play the ermines of the story",
    );
  });

  it("returns the original text if everything would be removed", () => {
    expect(stripSafeFillers("um please").sanitized).toBe("um please");
  });

  it("reports the number of removed fillers", () => {
    const result = stripSafeFillers("please um play");
    expect(result.removedFillerCount).toBe(2);
    expect(result.sanitized).toBe("play");
  });
});
