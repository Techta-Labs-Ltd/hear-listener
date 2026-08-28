import { rankBiasTerms } from "@/utils/voice/recognition-dictionary";
import type { BiasTermInput } from "@/types";

describe("recognition dictionary bias ranking", () => {
  it("deduplicates case-insensitively, keeping the highest score", () => {
    const inputs: BiasTermInput[] = [
      { term: "Tynedale Talking Magazine", source: "popular" },
      { term: "tynedale talking magazine", source: "active-entity" },
    ];
    const ranked = rankBiasTerms(inputs, 10);
    expect(ranked).toEqual(["tynedale talking magazine"]);
  });

  it("sorts by source score descending", () => {
    const inputs: BiasTermInput[] = [
      { term: "Popular Name", source: "popular" },
      { term: "Active Entity", source: "active-entity" },
      { term: "Visible Name", source: "visible-result" },
    ];
    const ranked = rankBiasTerms(inputs, 10);
    expect(ranked).toEqual(["Active Entity", "Visible Name", "Popular Name"]);
  });

  it("prefers shorter terms on score ties", () => {
    const inputs: BiasTermInput[] = [
      { term: "Long Organisation Name", source: "visible-result" },
      { term: "Short Org", source: "visible-result" },
    ];
    const ranked = rankBiasTerms(inputs, 10);
    expect(ranked).toEqual(["Short Org", "Long Organisation Name"]);
  });

  it("applies the requested limit", () => {
    const inputs: BiasTermInput[] = Array.from({ length: 20 }, (_, index) => ({
      term: `Term ${index}`,
      source: "popular" as const,
    }));
    expect(rankBiasTerms(inputs, 5)).toHaveLength(5);
  });

  it("skips empty terms", () => {
    const inputs: BiasTermInput[] = [
      { term: "  ", source: "active-entity" },
      { term: "Real Term", source: "popular" },
    ];
    expect(rankBiasTerms(inputs, 10)).toEqual(["Real Term"]);
  });
});
