import { parseUtterance } from "@/utils/voice/matching/semantic-parser";

describe("semantic utterance parser", () => {
  it("detects play actions and strips the starter", () => {
    const parsed = parseUtterance("play something");
    expect(parsed.action).toBe("play");
  });

  it("detects find variants and recommendation context", () => {
    expect(parseUtterance("find me a story").action).toBe("find");
    expect(parseUtterance("let me hear something").action).toBe("find");
    const recommended = parseUtterance("recommend something");
    expect(recommended.action).toBe("play");
    expect(recommended.modifiers.recommended).toBe(true);
  });

  it("parses the latest publication from relation", () => {
    const parsed = parseUtterance(
      "play the latest publication from tynedale talking magazine",
    );
    expect(parsed.modifiers.latest).toBe(true);
    expect(parsed.modifiers.publication).toBe(true);
    expect(parsed.relations).toHaveLength(1);
    expect(parsed.relations[0]).toMatchObject({
      relation: "from",
      span: { text: "tynedale talking magazine" },
      expectedTypes: ["organization", "publication", "location"],
    });
  });

  it("parses by and in relations for creators and locations", () => {
    const parsed = parseUtterance("play stories by signal and noise in bristol");
    expect(parsed.action).toBe("play");
    const relations = parsed.relations.map((relation) => relation.relation);
    expect(relations).toContain("by");
    expect(relations).toContain("in");
  });

  it("parses local and near-me modifiers without changing entity text", () => {
    const local = parseUtterance("play local news");
    expect(local.modifiers.local).toBe(true);
    expect(local.residual).toBe("");
    const near = parseUtterance("play news near me");
    expect(near.modifiers.local).toBe(true);
  });

  it("keeps content nouns inside entity spans when they are part of the name", () => {
    const parsed = parseUtterance("play talking magazine");
    expect(parsed.residual).toBe("talking magazine");
  });

  it("generates longest-first content windows", () => {
    const parsed = parseUtterance("play tynedale talking magazine");
    expect(parsed.contentWindows[0].text).toBe("tynedale talking magazine");
    expect(parsed.contentWindows.map((span) => span.text)).toContain(
      "tynedale talking",
    );
    expect(parsed.contentWindows.map((span) => span.text)).toContain(
      "talking magazine",
    );
  });

  it("treats bare entity phrases as no-action utterances", () => {
    const parsed = parseUtterance("tynedale talking magazine");
    expect(parsed.action).toBe("none");
    expect(parsed.residual).toBe("tynedale talking magazine");
  });

  it("parses trending and recommended play modes", () => {
    expect(parseUtterance("what is trending").modifiers.trending).toBe(true);
    expect(parseUtterance("play trending").modifiers.trending).toBe(true);
  });
});
