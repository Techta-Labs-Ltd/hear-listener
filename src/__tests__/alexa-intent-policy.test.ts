import model from "../../en-gb.json";
import {
  ALEXA_EXTERNAL_INTENT_NAMES,
  ALEXA_LOCAL_INTENT_NAMES,
} from "@/constants/alexa-intents";

describe("Alexa intent routing policy", () => {
  it("classifies every Alexa intent exactly once", () => {
    const intentNames = model.interactionModel.languageModel.intents.map(
      (intent) => intent.name,
    );
    const classified = [
      ...ALEXA_LOCAL_INTENT_NAMES,
      ...ALEXA_EXTERNAL_INTENT_NAMES,
    ];

    expect(new Set(classified).size).toBe(classified.length);
    expect(new Set(classified)).toEqual(new Set(intentNames));
  });
});
